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
import { CreateCrewDto } from './dto/create-crew.dto';
import { QueryCrewDto } from './dto/query-crew.dto';

@Controller('crews')
@UseGuards(SessionAuthGuard)
export class CrewsController {
  constructor(private readonly crewsService: CrewsService) {}

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
