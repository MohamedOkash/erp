import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CrewsService } from './crews.service';
import { CreateCrewDto, CreateCrewTemplateDto } from './dto/create-crew.dto';
import { QueryCrewDto } from './dto/query-crew.dto';

@Controller('crews')
@UseGuards(SessionAuthGuard)
export class CrewsController {
  constructor(private readonly crewsService: CrewsService) {}

  @Get('templates')
  getTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.crewsService.getTemplates(user.companyId);
  }

  @Post('templates')
  createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrewTemplateDto,
  ) {
    return this.crewsService.createTemplate(user.companyId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryCrewDto) {
    return this.crewsService.findAll(user.companyId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.crewsService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCrewDto) {
    return this.crewsService.create(user.companyId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.crewsService.remove(user.companyId, id);
  }
}
