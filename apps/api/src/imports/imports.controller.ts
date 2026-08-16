import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImportUploadResponseDto> {
    return this.importsService.uploadEmployeesXlsx(user.companyId, file);
  }

  /**
   * Upload & stage production XLSX file
   * Route: POST /api/v1/imports/production/upload
   */
  @Post('production/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProduction(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.uploadProductionXlsx(user.companyId, file);
  }

  /**
   * Upload & stage project BOQ XLSX file
   * Route: POST /api/v1/imports/boq/upload
   */
  @Post('boq/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBoq(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.uploadBoqXlsx(user.companyId, file);
  }

  /**
   * Upload & stage attendance XLSX file
   * Route: POST /api/v1/imports/attendance/upload
   */
  @Post('attendance/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttendance(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.uploadAttendanceXlsx(user.companyId, file);
  }

  /**
   * Upload & stage biometric device attendance file
   * Route: POST /api/v1/imports/attendance-device/upload
   */
  @Post('attendance-device/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttendanceDevice(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.uploadAttendanceDeviceXlsx(user.companyId, file);
  }

  /**
   * Update a single staging row parsed_data / status before commit
   * Route: PATCH /api/v1/imports/staging/:rowId
   */
  @Patch('staging/:rowId')
  async updateStagingRow(
    @Param('rowId') rowId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.updateStagingRow(user.companyId, rowId, dto);
  }

  /**
   * Commit valid rows from staging to employees, production, boq, or attendance table
   * Route: POST /api/v1/imports/:jobId/commit
   */
  @Post(':jobId/commit')
  async commitImport(
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.commitImport(user.companyId, jobId);
  }
}
