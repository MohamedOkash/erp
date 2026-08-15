import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { DatabaseService } from '../database/database.service';
import {
  ImportSummary,
  ImportUploadResponseDto,
  StagingRowResponse,
} from './dto/upload-response.dto';

@Injectable()
export class ImportsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Upload & stage employees XLSX file without directly writing to employees table
   * Section 7 Item 2 of HANDOFF.md
   */
  async uploadEmployeesXlsx(
    companyId: string,
    file: Express.Multer.File,
  ): Promise<ImportUploadResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found in Excel file');
    }

    // Auto-detect columns from Row 1
    const headerRow = worksheet.getRow(1);
    const colMap: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
      const headerVal = cell.text ? cell.text.trim().toLowerCase() : '';
      if (!headerVal) return;

      if (['name', 'الاسم', 'اسم', 'اسم الموظف', 'fullname'].includes(headerVal)) {
        colMap['name'] = colNumber;
      } else if (
        [
          'identity',
          'قومي',
          'هوية',
          'الرقم القومي',
          'رقم قومي',
          'nationalid',
          'national_id',
          'id_number',
        ].includes(headerVal)
      ) {
        colMap['nationalId'] = colNumber;
      } else if (['phone', 'هاتف', 'موبايل', 'تليفون', 'mobile'].includes(headerVal)) {
        colMap['phone'] = colNumber;
      } else if (
        ['branch', 'فرع', 'الفرع', 'primarybranch', 'branch_name'].includes(headerVal)
      ) {
        colMap['branch'] = colNumber;
      } else if (
        ['wage', 'أجر', 'الاجر', 'الأجر', 'dailywage', 'daily_wage', 'راتب'].includes(
          headerVal,
        )
      ) {
        colMap['wage'] = colNumber;
      }
    });

    return this.db.withTenantTransaction(companyId, async (client) => {
      // 1. Fetch branches for matching
      const branchesRes = await client.query(
        `SELECT id, name, code FROM branches WHERE company_id = $1`,
        [companyId],
      );
      const branchMap = new Map<string, string>();
      for (const b of branchesRes.rows) {
        branchMap.set(b.name.trim().toLowerCase(), b.id);
        if (b.code) branchMap.set(b.code.trim().toLowerCase(), b.id);
      }

      // 2. Fetch existing national IDs to detect DB duplicates
      const existingRes = await client.query(
        `SELECT national_id FROM employees WHERE company_id = $1`,
        [companyId],
      );
      const dbNationalIds = new Set<string>(
        existingRes.rows.map((r) => r.national_id.trim()),
      );

      const seenFileNationalIds = new Set<string>();
      const parsedRows: StagingRowResponse[] = [];
      const rowDbRecords: any[] = [];

      const rowCount = worksheet.rowCount;

      for (let r = 2; r <= rowCount; r++) {
        const row = worksheet.getRow(r);
        const nameVal = colMap['name'] ? row.getCell(colMap['name']).text?.trim() : null;
        const nationalIdVal = colMap['nationalId']
          ? row.getCell(colMap['nationalId']).text?.trim()
          : null;
        const phoneVal = colMap['phone'] ? row.getCell(colMap['phone']).text?.trim() : null;
        const branchVal = colMap['branch']
          ? row.getCell(colMap['branch']).text?.trim()
          : null;
        const wageVal = colMap['wage'] ? row.getCell(colMap['wage']).value : 0;

        // Skip completely empty rows
        if (!nameVal && !nationalIdVal && !phoneVal && !branchVal) {
          continue;
        }

        const wageNum = parseFloat(String(wageVal || '0')) || 0;
        const errors: string[] = [];
        let status: 'valid' | 'duplicate' | 'invalid' = 'valid';

        // Check required fields
        if (!nameVal || !nationalIdVal) {
          status = 'invalid';
          if (!nameVal) errors.push('اسم الموظف حقل إلزامي');
          if (!nationalIdVal) errors.push('الرقم القومي حقل إلزامي');
        } else if (dbNationalIds.has(nationalIdVal)) {
          status = 'duplicate';
          errors.push('الرقم القومي مكرر في قاعدة البيانات');
        } else if (seenFileNationalIds.has(nationalIdVal)) {
          status = 'duplicate';
          errors.push('الرقم القومي مكرر داخل نفس الملف');
        } else {
          status = 'valid';
          seenFileNationalIds.add(nationalIdVal);
        }

        let primaryBranchId: string | null = null;
        if (branchVal) {
          primaryBranchId = branchMap.get(branchVal.toLowerCase()) || null;
        }

        const parsedData = {
          name: nameVal || null,
          nationalId: nationalIdVal || null,
          phone: phoneVal || null,
          branch: branchVal || null,
          primaryBranchId,
          wage: wageNum,
          roleType: 'worker',
        };

        const rawData: any = {};
        row.eachCell((cell, colNumber) => {
          rawData[`col_${colNumber}`] = cell.text;
        });

        parsedRows.push({
          rowIndex: r,
          name: parsedData.name,
          nationalId: parsedData.nationalId,
          phone: parsedData.phone,
          branch: parsedData.branch,
          wage: parsedData.wage,
          status,
          errors,
        });

        rowDbRecords.push({
          rowIndex: r,
          rawData,
          parsedData,
          dbStatus: status === 'valid' ? 'valid' : 'error',
          errors,
        });
      }

      const validCount = parsedRows.filter((r) => r.status === 'valid').length;
      const duplicateCount = parsedRows.filter((r) => r.status === 'duplicate').length;
      const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;
      const totalCount = parsedRows.length;

      const summary: ImportSummary = {
        total: totalCount,
        valid: validCount,
        duplicate: duplicateCount,
        invalid: invalidCount,
      };

      // 3. Create record in import_jobs (status = 'staged')
      const jobRes = await client.query(
        `INSERT INTO import_jobs (
          company_id, job_type, file_name, status, total_rows, valid_rows, error_rows
        ) VALUES ($1, 'employees', $2, 'staged', $3, $4, $5)
        RETURNING id`,
        [
          companyId,
          file.originalname || 'employees.xlsx',
          totalCount,
          validCount,
          duplicateCount + invalidCount,
        ],
      );

      const jobId = jobRes.rows[0].id;

      // 4. Insert staging rows & row errors
      for (const item of rowDbRecords) {
        const stagingRes = await client.query(
          `INSERT INTO import_staging_rows (
            company_id, import_job_id, row_index, raw_data, parsed_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [
            companyId,
            jobId,
            item.rowIndex,
            JSON.stringify(item.rawData),
            JSON.stringify(item.parsedData),
            item.dbStatus,
          ],
        );

        const stagingId = stagingRes.rows[0].id;

        for (const err of item.errors) {
          const errCode =
            item.dbStatus === 'error' && err.includes('مكرر')
              ? 'DUPLICATE_IDENTITY'
              : 'INVALID_DATA';

          await client.query(
            `INSERT INTO import_row_errors (
              company_id, staging_row_id, column_name, error_code, error_message
            ) VALUES ($1, $2, 'nationalId', $3, $4)`,
            [companyId, stagingId, errCode, err],
          );
        }
      }

      return {
        jobId,
        summary,
        rows: parsedRows,
      };
    });
  }

  /**
   * Commit staged valid rows to employees table
   * Section 7 Item 2 of HANDOFF.md
   */
  async commitImport(companyId: string, jobId: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const jobRes = await client.query(
        `SELECT id, status, job_type FROM import_jobs WHERE id = $1`,
        [jobId],
      );

      if (jobRes.rows.length === 0) {
        throw new NotFoundException(`Import job with ID '${jobId}' not found`);
      }

      const job = jobRes.rows[0];
      if (job.status === 'committed') {
        throw new BadRequestException('This import job has already been committed');
      }

      // Fetch only valid staging rows
      const validRowsRes = await client.query(
        `SELECT id, parsed_data FROM import_staging_rows
         WHERE import_job_id = $1 AND status = 'valid'`,
        [jobId],
      );

      const validRows = validRowsRes.rows;

      for (const row of validRows) {
        const p = row.parsed_data;
        await client.query(
          `INSERT INTO employees (
            company_id, national_id, name, phone, role_type, primary_branch_id, daily_wage
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (company_id, national_id) DO NOTHING`,
          [
            companyId,
            p.nationalId,
            p.name,
            p.phone || null,
            p.roleType || 'worker',
            p.primaryBranchId || null,
            p.wage || 0,
          ],
        );
      }

      // Update staging rows to committed
      await client.query(
        `UPDATE import_staging_rows
         SET status = 'committed'
         WHERE import_job_id = $1 AND status = 'valid'`,
        [jobId],
      );

      // Update import job status to committed
      await client.query(
        `UPDATE import_jobs
         SET status = 'committed',
             committed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [jobId],
      );

      const errorRowsRes = await client.query(
        `SELECT COUNT(*)::int AS count FROM import_staging_rows
         WHERE import_job_id = $1 AND status != 'committed'`,
        [jobId],
      );

      return {
        imported: validRows.length,
        skipped: errorRowsRes.rows[0].count,
      };
    });
  }
}
