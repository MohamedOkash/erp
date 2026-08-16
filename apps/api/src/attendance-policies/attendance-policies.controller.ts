import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendancePoliciesService } from './attendance-policies.service';
import { CreateAttendancePolicyDto } from './dto/create-attendance-policy.dto';
import { UpdateAttendancePolicyDto } from './dto/update-attendance-policy.dto';
import { QueryAttendancePolicyDto } from './dto/query-attendance-policy.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('attendance-policies')
@UseGuards(SessionAuthGuard)
export class AttendancePoliciesController {
  constructor(private readonly policiesService: AttendancePoliciesService) {}

  private checkManagerPermission(user: AuthenticatedUser) {
    const allowedRoles = [
      'admin',
      'super_admin',
      'company_admin',
      'general_manager',
      'executive_manager',
      'branch_manager',
      'project_manager',
    ];
    const hasRole = user.roles?.some((r) =>
      allowedRoles.includes(r.roleCode?.toLowerCase()),
    );
    const hasPerm = user.permissions?.includes('manage:attendance_policies') || user.permissions?.includes('admin');
    if (!hasRole && !hasPerm) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only Project Managers or Admins can create or modify attendance policies',
      });
    }
  }

  @Get()
  async listPolicies(
    @Query() query: QueryAttendancePolicyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.findPolicies(user.companyId, query);
  }

  @Get(':id')
  async getPolicy(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.getPolicyById(user.companyId, id);
  }

  @Post()
  async createPolicy(
    @Body() dto: CreateAttendancePolicyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.checkManagerPermission(user);
    return this.policiesService.createPolicy(user.companyId, dto);
  }

  @Patch(':id')
  async updatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdateAttendancePolicyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.checkManagerPermission(user);
    return this.policiesService.updatePolicy(user.companyId, id, dto);
  }

  @Delete(':id')
  async deletePolicy(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.checkManagerPermission(user);
    return this.policiesService.deletePolicy(user.companyId, id);
  }
}
