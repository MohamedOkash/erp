import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { ScopeService } from '../common/services/scope.service';
import { AuthenticatedUser } from '../auth/auth.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly scopeService: ScopeService,
  ) {
    const uploadBase = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadBase)) {
      fs.mkdirSync(uploadBase, { recursive: true });
    }
  }

  /**
   * Helper to store uploaded file buffer
   */
  private saveFileToStorage(file: Express.Multer.File): { fileName: string; fileUrl: string; fileSize: number } {
    const now = new Date();
    const dateDir = path.join(
      process.cwd(),
      'uploads',
      'documents',
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    );
    fs.mkdirSync(dateDir, { recursive: true });

    const safeFilename = `${crypto.randomUUID()}_${path.basename(file.originalname)}`;
    const fullPath = path.join(dateDir, safeFilename);
    fs.writeFileSync(fullPath, file.buffer);

    const fileUrl = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
    return {
      fileName: file.originalname,
      fileUrl,
      fileSize: file.size,
    };
  }

  /**
   * Upload initial document with version 1
   */
  async uploadDocument(
    companyId: string,
    userId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    user?: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'A file is required for upload',
      });
    }

    if (user && dto.projectId) {
      await this.scopeService.assertProjectInScope(user, dto.projectId);
    }

    return this.db.withTenantTransaction(companyId, async (client) => {
      // 1. Resolve or create category
      let categoryId = dto.categoryId;
      if (!categoryId) {
        const categoryName = dto.category || dto.entityType || 'General';
        const catRes = await client.query(
          `SELECT id FROM document_categories WHERE company_id = $1 AND name = $2`,
          [companyId, categoryName],
        );

        if (catRes.rows.length > 0) {
          categoryId = catRes.rows[0].id;
        } else {
          const newCat = await client.query(
            `INSERT INTO document_categories (company_id, name, description)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [companyId, categoryName, `${categoryName} documents`],
          );
          categoryId = newCat.rows[0].id;
        }
      }

      // 2. Save physical file
      const saved = this.saveFileToStorage(file);

      // 3. Create document record
      const title = dto.title || file.originalname;
      const docRes = await client.query(
        `INSERT INTO documents (
           company_id, category_id, project_id, title, document_number, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, company_id, category_id, project_id, title, document_number, created_at, updated_at`,
        [
          companyId,
          categoryId,
          dto.projectId || null,
          title,
          dto.documentNumber || null,
          userId,
        ],
      );
      const document = docRes.rows[0];

      // 4. Create document_versions (version 1)
      const versionRes = await client.query(
        `INSERT INTO document_versions (
           company_id, document_id, version_number, file_name, file_url, file_size_bytes, notes, uploaded_by
         ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
         RETURNING id, company_id, document_id, version_number, file_name, file_url, file_size_bytes, notes, uploaded_by, created_at`,
        [
          companyId,
          document.id,
          saved.fileName,
          saved.fileUrl,
          saved.fileSize,
          dto.notes || dto.description || null,
          userId,
        ],
      );

      return {
        id: document.id,
        title: document.title,
        categoryId: document.category_id,
        projectId: document.project_id,
        documentNumber: document.document_number,
        fileName: saved.fileName,
        fileSize: saved.fileSize,
        fileUrl: saved.fileUrl,
        version: 1,
        createdAt: document.created_at,
      };
    });
  }

  /**
   * List documents with filters and pagination
   */
  async findDocuments(
    companyId: string,
    query: QueryDocumentDto,
    user?: AuthenticatedUser,
  ) {
    if (user && query.projectId) {
      await this.scopeService.assertProjectInScope(user, query.projectId);
    }
    const projectScope = user ? await this.scopeService.getProjectScope(user) : null;

    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['d.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (projectScope !== null) {
        if (projectScope.length === 0) {
          return { data: [], total: 0, page: 1, limit: query.limit || 20, totalPages: 0 };
        }
        conditions.push(`(d.project_id IS NULL OR d.project_id = ANY($${paramIdx++}::uuid[]))`);
        params.push(projectScope);
      }

      if (query.projectId) {
        conditions.push(`d.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      if (query.categoryId) {
        conditions.push(`d.category_id = $${paramIdx++}`);
        params.push(query.categoryId);
      }

      if (query.category) {
        conditions.push(`c.name ILIKE $${paramIdx++}`);
        params.push(query.category);
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM documents d
         LEFT JOIN document_categories c ON d.category_id = c.id AND d.company_id = c.company_id
         WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          d.id, d.company_id, d.category_id, d.project_id, d.title, d.document_number,
          d.current_version AS version, d.created_by, d.created_at, d.updated_at,
          c.name AS category_name,
          p.name AS project_name,
          v.file_name, v.file_url, v.file_size_bytes AS file_size
        FROM documents d
        LEFT JOIN document_categories c ON d.category_id = c.id AND d.company_id = c.company_id
        LEFT JOIN projects p ON d.project_id = p.id AND d.company_id = p.company_id
        LEFT JOIN document_versions v ON d.id = v.document_id AND d.current_version = v.version_number AND d.company_id = v.company_id
        WHERE ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      const dataRes = await client.query(dataSql, [...params, limit, offset]);

      return {
        data: dataRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      };
    });
  }

  /**
   * Get single document metadata
   */
  async getDocumentById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT 
           d.id, d.company_id, d.category_id, d.project_id, d.title, d.document_number,
           d.current_version AS version, d.created_by, d.created_at, d.updated_at,
           c.name AS category_name,
           p.name AS project_name,
           v.file_name, v.file_url, v.file_size_bytes AS file_size
         FROM documents d
         LEFT JOIN document_categories c ON d.category_id = c.id AND d.company_id = c.company_id
         LEFT JOIN projects p ON d.project_id = p.id AND d.company_id = p.company_id
         LEFT JOIN document_versions v ON d.id = v.document_id AND d.current_version = v.version_number AND d.company_id = v.company_id
         WHERE d.company_id = $1 AND d.id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Download latest or specific version of document
   */
  async downloadDocument(companyId: string, id: string, versionNumber?: number) {
    return this.db.withTenantClient(companyId, async (client) => {
      const docRes = await client.query(
        `SELECT id, current_version FROM documents WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (docRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        });
      }

      const targetVersion = versionNumber || docRes.rows[0].current_version;

      const verRes = await client.query(
        `SELECT file_name, file_url, file_size_bytes
         FROM document_versions
         WHERE company_id = $1 AND document_id = $2 AND version_number = $3`,
        [companyId, id, targetVersion],
      );

      if (verRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'DOCUMENT_VERSION_NOT_FOUND',
          message: 'Document version not found',
        });
      }

      const ver = verRes.rows[0];
      const absolutePath = path.resolve(process.cwd(), ver.file_url);

      if (!fs.existsSync(absolutePath)) {
        throw new NotFoundException({
          code: 'DOCUMENT_FILE_NOT_FOUND',
          message: 'File does not exist on storage',
        });
      }

      const buffer = fs.readFileSync(absolutePath);
      return {
        fileName: ver.file_name,
        fileUrl: ver.file_url,
        buffer,
        size: ver.file_size_bytes,
      };
    });
  }

  /**
   * Upload a new version for an existing document
   */
  async uploadNewVersion(
    companyId: string,
    userId: string,
    id: string,
    file: Express.Multer.File,
    notes?: string,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'A file is required to upload a new version',
      });
    }

    return this.db.withTenantTransaction(companyId, async (client) => {
      const docRes = await client.query(
        `SELECT id, current_version FROM documents WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (docRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        });
      }

      const nextVersion = docRes.rows[0].current_version + 1;
      const saved = this.saveFileToStorage(file);

      // Insert version
      const verRes = await client.query(
        `INSERT INTO document_versions (
           company_id, document_id, version_number, file_name, file_url, file_size_bytes, notes, uploaded_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, company_id, document_id, version_number, file_name, file_url, file_size_bytes, notes, created_at`,
        [
          companyId,
          id,
          nextVersion,
          saved.fileName,
          saved.fileUrl,
          saved.fileSize,
          notes || null,
          userId,
        ],
      );

      // Update documents current_version
      await client.query(
        `UPDATE documents SET current_version = $1, updated_at = CURRENT_TIMESTAMP WHERE company_id = $2 AND id = $3`,
        [nextVersion, companyId, id],
      );

      return {
        id: verRes.rows[0].id,
        documentId: id,
        fileName: saved.fileName,
        version: nextVersion,
        versionNumber: nextVersion,
        fileSize: saved.fileSize,
        fileUrl: saved.fileUrl,
      };
    });
  }

  /**
   * List all versions of a document
   */
  async getDocumentVersions(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const docRes = await client.query(
        `SELECT id FROM documents WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (docRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        });
      }

      const verRes = await client.query(
        `SELECT id, version_number AS version, version_number, file_name, file_url, file_size_bytes AS file_size, notes, created_at
         FROM document_versions
         WHERE company_id = $1 AND document_id = $2
         ORDER BY version_number DESC`,
        [companyId, id],
      );

      return {
        versions: verRes.rows,
      };
    });
  }

  /**
   * Delete document and all versions + files from disk
   */
  async deleteDocument(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const verRes = await client.query(
        `SELECT file_url FROM document_versions WHERE company_id = $1 AND document_id = $2`,
        [companyId, id],
      );

      if (verRes.rows.length === 0) {
        const checkDoc = await client.query(
          `SELECT id FROM documents WHERE company_id = $1 AND id = $2`,
          [companyId, id],
        );
        if (checkDoc.rows.length === 0) {
          throw new NotFoundException({
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
          });
        }
      }

      // Delete from DB (cascades to document_versions)
      await client.query(
        `DELETE FROM documents WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      // Clean up files from filesystem
      for (const row of verRes.rows) {
        try {
          const fullPath = path.resolve(process.cwd(), row.file_url);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch {
          // Ignore filesystem errors during cleanup
        }
      }
    });
  }
}
