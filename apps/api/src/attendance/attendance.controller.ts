import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('attendance')
@UseGuards(SessionAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Create new attendance record
   * Route: POST /api/v1/attendance
   */
  @Post()
  async createAttendance(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.createAttendance(
      user.companyId,
      user.userId,
      dto,
      user,
    );
  }

  /**
   * List attendance records with filters and pagination
   * Route: GET /api/v1/attendance
   */
  @Get()
  async listAttendance(
    @Query() query: QueryAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.findAttendance(user.companyId, query, user);
  }

  /**
   * Get single attendance record by ID
   * Route: GET /api/v1/attendance/:id
   */
  @Get(':id')
  async getAttendance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getAttendanceById(user.companyId, id);
  }

  /**
   * Update attendance record
   * Route: PUT /api/v1/attendance/:id
   */
  @Put(':id')
  async updateAttendance(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.updateAttendance(user.companyId, id, dto);
  }

  /**
   * Delete attendance record
   * Route: DELETE /api/v1/attendance/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttendance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.deleteAttendance(user.companyId, id);
  }
}
