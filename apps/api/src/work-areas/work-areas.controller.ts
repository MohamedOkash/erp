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
import { WorkAreasService } from './work-areas.service';
import { CreateWorkAreaDto } from './dto/create-work-area.dto';
import { UpdateWorkAreaDto } from './dto/update-work-area.dto';
import { QueryWorkAreaDto } from './dto/query-work-area.dto';
import { SaveRoomBoqDto } from './dto/save-room-boq.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('work-areas')
@UseGuards(SessionAuthGuard)
export class WorkAreasController {
  constructor(private readonly workAreasService: WorkAreasService) {}

  @Get()
  async listWorkAreas(
    @Query() query: QueryWorkAreaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workAreasService.findWorkAreas(user.companyId, query);
  }

  @Get(':id')
  async getWorkArea(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workAreasService.getWorkAreaById(user.companyId, id);
  }

  @Post()
  async createWorkArea(
    @Body() dto: CreateWorkAreaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workAreasService.createWorkArea(user.companyId, dto);
  }

  @Patch(':id')
  async updateWorkArea(
    @Param('id') id: string,
    @Body() dto: UpdateWorkAreaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workAreasService.updateWorkArea(user.companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkArea(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.workAreasService.deleteWorkArea(user.companyId, id);
  }

  @Get(':id/room-boq')
  async getRoomBoq(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workAreasService.getRoomBoqItems(user.companyId, id);
  }

  @Post(':id/room-boq')
  async saveRoomBoq(
    @Param('id') id: string,
    @Body() dto: SaveRoomBoqDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workAreasService.saveRoomBoqItem(user.companyId, id, dto);
  }

  @Delete(':id/room-boq/:itemId')
  async deleteRoomBoq(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workAreasService.deleteRoomBoqItem(user.companyId, id, itemId);
  }
}
