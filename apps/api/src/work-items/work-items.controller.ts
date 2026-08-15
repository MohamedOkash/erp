import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
