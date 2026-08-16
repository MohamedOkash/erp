import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemDto } from './dto/query-work-item.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('work-items')
@UseGuards(SessionAuthGuard)
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Get()
  async listWorkItems(
    @Query() query: QueryWorkItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.findWorkItems(user.companyId, query);
  }

  @Get(':id')
  async getWorkItem(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.getWorkItemById(user.companyId, id);
  }

  @Post()
  async createWorkItem(
    @Body() dto: CreateWorkItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.createWorkItem(user.companyId, dto);
  }

  @Patch(':id')
  async updateWorkItem(
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (dto.defaultDailyTarget !== undefined || dto.customDailyTarget !== undefined) {
      const roleCodes = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.roleCode));
      const canManageTargets = roleCodes.some((r: string) =>
        ['project_manager', 'program_manager', 'admin', 'company_admin', 'super_admin'].includes(r),
      );
      if (!canManageTargets) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: 'Only Project Managers, Program Managers and Admins can modify target values',
            code: 'FORBIDDEN',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }
    return this.workItemsService.updateWorkItem(user.companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkItem(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.deleteWorkItem(user.companyId, id);
  }
}
