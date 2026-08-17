import {
  Body,
  Controller,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService, AuthenticatedUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * User login endpoint
   * Route: POST /api/v1/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.authService.login(dto.username, dto.password, ip, userAgent);
  }

  /**
   * Get current authenticated user profile
   * Route: GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(SessionAuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.userId,
        username: user.username,
        fullName: user.fullName,
        employeeId: user.employeeId,
        roles: user.roles,
        permissions: user.permissions,
        scopes: user.scopes || [],
      },
      companyId: user.companyId,
    };
  }

  /**
   * Update current authenticated user profile
   * Route: PATCH /api/v1/auth/me
   */
  @Patch('me')
  @UseGuards(SessionAuthGuard)
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.companyId, user.userId, dto);
  }

  /**
   * Change current authenticated user password
   * Route: POST /api/v1/auth/change-password
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.companyId, user.userId, dto);
  }

  /**
   * User logout endpoint (invalidates current session)
   * Route: POST /api/v1/auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    return this.authService.logout(token);
  }
}


