import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { RequestTransferDto } from './dto/request-transfer.dto';
import { RejectTransferDto } from './dto/approve-transfer.dto';
import { QueryTransfersDto } from './dto/query-transfers.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('transfers')
@UseGuards(SessionAuthGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  async listTransfers(
    @Query() query: QueryTransfersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.findTransfers(user.companyId, query);
  }

  @Get(':id')
  async getTransfer(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.getTransferById(user.companyId, id);
  }

  @Post('request')
  async requestTransfer(
    @Body() dto: RequestTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const roleCodes = (user.roles || []).map((r: any) =>
      typeof r === 'string' ? r : r.roleCode,
    );
    const canRequest = roleCodes.some((r: string) =>
      ['engineer', 'project_manager', 'program_manager', 'admin', 'company_admin', 'super_admin'].includes(r),
    );

    if (!canRequest) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Only Engineers, Project Managers, Program Managers and Admins can request staff transfers',
          code: 'FORBIDDEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const primaryRole = roleCodes.find((r) =>
      ['program_manager', 'project_manager', 'engineer', 'admin', 'company_admin'].includes(r),
    ) || 'engineer';

    return this.transfersService.requestTransfer(
      user.companyId,
      user.userId,
      primaryRole,
      dto,
    );
  }

  @Post(':id/approve')
  async approveTransfer(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const roleCodes = (user.roles || []).map((r: any) =>
      typeof r === 'string' ? r : r.roleCode,
    );
    const canApprove = roleCodes.some((r: string) =>
      ['project_manager', 'program_manager', 'admin', 'company_admin', 'super_admin'].includes(r),
    );

    if (!canApprove) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Only Project Managers, Program Managers and Admins can approve transfers',
          code: 'FORBIDDEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return this.transfersService.approveTransfer(user.companyId, user.userId, id);
  }

  @Post(':id/reject')
  async rejectTransfer(
    @Param('id') id: string,
    @Body() dto: RejectTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const roleCodes = (user.roles || []).map((r: any) =>
      typeof r === 'string' ? r : r.roleCode,
    );
    const canReject = roleCodes.some((r: string) =>
      ['project_manager', 'program_manager', 'admin', 'company_admin', 'super_admin'].includes(r),
    );

    if (!canReject) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Only Project Managers, Program Managers and Admins can reject transfers',
          code: 'FORBIDDEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return this.transfersService.rejectTransfer(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  @Post(':id/execute')
  async executeTransfer(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const roleCodes = (user.roles || []).map((r: any) =>
      typeof r === 'string' ? r : r.roleCode,
    );
    const canExecute = roleCodes.some((r: string) =>
      ['project_manager', 'program_manager', 'admin', 'company_admin', 'super_admin'].includes(r),
    );

    if (!canExecute) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Only Project Managers, Program Managers and Admins can execute transfers',
          code: 'FORBIDDEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return this.transfersService.executeTransfer(user.companyId, user.userId, id);
  }
}
