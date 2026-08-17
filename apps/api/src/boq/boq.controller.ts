import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BoqService } from './boq.service';
import { QueryBoqDto } from './dto/query-boq.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('boq')
@UseGuards(SessionAuthGuard)
export class BoqController {
  constructor(private readonly boqService: BoqService) {}

  @Get()
  async listBoqProgress(
    @Query() query: QueryBoqDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.boqService.getBoqProgress(user.companyId, query, user);
  }

  @Get(':id')
  async getBoqItemProgress(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.boqService.getBoqItemProgressById(user.companyId, id);
  }
}
