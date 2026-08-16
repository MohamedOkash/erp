import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkItemStagesService } from './work-item-stages.service';
import { CreateWorkItemStageDto } from './dto/create-work-item-stage.dto';
import { UpdateWorkItemStageDto } from './dto/update-work-item-stage.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller()
@UseGuards(SessionAuthGuard)
export class WorkItemStagesController {
  constructor(private readonly stagesService: WorkItemStagesService) {}

  @Get('work-items/:itemId/stages')
  async listStages(
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stagesService.listStages(user.companyId, itemId);
  }

  @Post('work-items/:itemId/stages')
  async createStage(
    @Param('itemId') itemId: string,
    @Body() dto: CreateWorkItemStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stagesService.createStage(user.companyId, itemId, dto);
  }

  @Get('work-item-stages/:id')
  async getStage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stagesService.getStageById(user.companyId, id);
  }

  @Patch('work-item-stages/:id')
  async updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stagesService.updateStage(user.companyId, id, dto);
  }

  @Delete('work-item-stages/:id')
  async deleteStage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stagesService.deleteStage(user.companyId, id);
  }
}
