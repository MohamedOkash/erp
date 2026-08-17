import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('documents')
@UseGuards(SessionAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Upload new document (version 1)
   * Route: POST /api/v1/documents/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.uploadDocument(
      user.companyId,
      user.userId,
      file,
      dto,
      user,
    );
  }

  /**
   * List documents with filters and pagination
   * Route: GET /api/v1/documents
   */
  @Get()
  async listDocuments(
    @Query() query: QueryDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findDocuments(user.companyId, query, user);
  }

  /**
   * Download latest or specific version of document
   * Route: GET /api/v1/documents/:id/download
   */
  @Get(':id/download')
  async downloadDocument(
    @Param('id') id: string,
    @Query('version') version: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const versionNum = version ? parseInt(version, 10) : undefined;
    const downloaded = await this.documentsService.downloadDocument(
      user.companyId,
      id,
      versionNum,
    );

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(downloaded.fileName)}"`,
      'Content-Length': downloaded.size,
    });

    res.send(downloaded.buffer);
  }

  /**
   * List versions of a document
   * Route: GET /api/v1/documents/:id/versions
   */
  @Get(':id/versions')
  async getDocumentVersions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.getDocumentVersions(user.companyId, id);
  }

  /**
   * Upload new version for document
   * Route: POST /api/v1/documents/:id/upload-new-version
   */
  @Post(':id/upload-new-version')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNewVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('notes') notes: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.uploadNewVersion(
      user.companyId,
      user.userId,
      id,
      file,
      notes,
    );
  }

  /**
   * Get single document metadata
   * Route: GET /api/v1/documents/:id
   */
  @Get(':id')
  async getDocument(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.getDocumentById(user.companyId, id);
  }

  /**
   * Delete document and all versions
   * Route: DELETE /api/v1/documents/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.deleteDocument(user.companyId, id);
  }
}
