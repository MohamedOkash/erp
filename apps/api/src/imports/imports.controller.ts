import {
  Controller,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ImportsService } from './imports.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ImportUploadResponseDto } from './dto/upload-response.dto';

@Controller('imports')
@UseGuards(SessionAuthGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  /**
   * Upload & stage employees XLSX file
   * Route: POST /api/v1/imports/employees/upload
   */
  @Post('employees/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEmployees(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<ImportUploadResponseDto> {
    const companyId =
      req.user?.companyId ||
      req.headers['x-company-id'] ||
      req.headers['x-tenant-id'];
    return this.importsService.uploadEmployeesXlsx(companyId, file);
  }

  /**
   * Upload & stage production XLSX file
   * Route: POST /api/v1/imports/production/upload
   */
  @Post('production/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProduction(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const companyId =
      req.user?.companyId ||
      req.headers['x-company-id'] ||
      req.headers['x-tenant-id'];
    return this.importsService.uploadProductionXlsx(companyId, file);
  }

  /**
   * Commit valid rows from staging to employees or production table
   * Route: POST /api/v1/imports/:jobId/commit
   */
  @Post(':jobId/commit')
  async commitImport(
    @Param('jobId') jobId: string,
    @Req() req: any,
  ) {
    const companyId =
      req.user?.companyId ||
      req.headers['x-company-id'] ||
      req.headers['x-tenant-id'];
    return this.importsService.commitImport(companyId, jobId);
  }
}

