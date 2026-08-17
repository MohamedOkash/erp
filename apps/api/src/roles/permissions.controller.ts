import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';

@Controller('permissions')
@UseGuards(SessionAuthGuard)
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async listPermissions() {
    return this.rolesService.listPermissions();
  }
}
