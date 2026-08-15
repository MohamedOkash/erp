import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('notifications')
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * List notifications for current authenticated user
   * Route: GET /api/v1/notifications
   */
  @Get()
  async listNotifications(
    @Query() query: QueryNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.findNotifications(
      user.companyId,
      user.userId,
      query,
    );
  }

  /**
   * Get unread notifications count for badge
   * Route: GET /api/v1/notifications/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(
      user.companyId,
      user.userId,
    );
  }

  /**
   * Mark all unread notifications of the current user as read
   * Route: PATCH /api/v1/notifications/mark-all-read
   */
  @Patch('mark-all-read')
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(
      user.companyId,
      user.userId,
    );
  }

  /**
   * Mark single notification as read
   * Route: PATCH /api/v1/notifications/:id/read
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(
      user.companyId,
      user.userId,
      id,
    );
  }

  /**
   * Create notification (internal service usage)
   * Route: POST /api/v1/notifications
   */
  @Post()
  async createNotification(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.createNotification(
      user.companyId,
      dto,
    );
  }
}
