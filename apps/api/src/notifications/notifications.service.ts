import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create notification records for specific users or all active company users
   */
  async createNotification(companyId: string, dto: CreateNotificationDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      let targetUserIds: string[] = [];

      if (dto.userIds && dto.userIds.length > 0) {
        const usersRes = await client.query(
          `SELECT id FROM users WHERE company_id = $1 AND id = ANY($2::uuid[])`,
          [companyId, dto.userIds],
        );
        targetUserIds = usersRes.rows.map((r) => r.id);
      } else {
        const usersRes = await client.query(
          `SELECT id FROM users WHERE company_id = $1 AND is_active = true`,
          [companyId],
        );
        targetUserIds = usersRes.rows.map((r) => r.id);
      }

      if (targetUserIds.length === 0) {
        return { createdCount: 0 };
      }

      for (const targetUserId of targetUserIds) {
        await client.query(
          `INSERT INTO notifications (
             company_id, user_id, type, title, body, data
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            companyId,
            targetUserId,
            dto.type,
            dto.title,
            dto.message || dto.title,
            dto.metadata ? JSON.stringify(dto.metadata) : null,
          ],
        );
      }

      return { createdCount: targetUserIds.length };
    });
  }

  /**
   * List notifications for current user with filters and pagination
   */
  async findNotifications(
    companyId: string,
    userId: string,
    query: QueryNotificationDto,
  ) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['company_id = $1', 'user_id = $2'];
      const params: any[] = [companyId, userId];
      let paramIdx = 3;

      if (query.unreadOnly === 'true') {
        conditions.push(`is_read = false`);
      }

      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const whereClause = conditions.join(' AND ');

      // Total count
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM notifications WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      // Unread count
      const unreadRes = await client.query(
        `SELECT COUNT(*)::int AS unread_count FROM notifications WHERE company_id = $1 AND user_id = $2 AND is_read = false`,
        [companyId, userId],
      );
      const unreadCount = unreadRes.rows[0]?.unread_count || 0;

      // Data query
      const dataSql = `
        SELECT id, company_id, user_id, type, title, body AS message, body, data AS metadata, data, is_read, read_at, created_at
        FROM notifications
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      const dataRes = await client.query(dataSql, [...params, limit, offset]);

      return {
        data: dataRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
        unreadCount,
      };
    });
  }

  /**
   * Get unread notifications count for current user
   */
  async getUnreadCount(companyId: string, userId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT COUNT(*)::int AS count FROM notifications WHERE company_id = $1 AND user_id = $2 AND is_read = false`,
        [companyId, userId],
      );
      return { count: res.rows[0]?.count || 0 };
    });
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(companyId: string, userId: string, notificationId: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `UPDATE notifications
         SET is_read = true, read_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND user_id = $2 AND id = $3
         RETURNING id, company_id, user_id, type, title, body AS message, body, data AS metadata, data, is_read, read_at, created_at`,
        [companyId, userId, notificationId],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Mark all unread notifications of the current user as read in a single UPDATE query
   */
  async markAllAsRead(companyId: string, userId: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `UPDATE notifications
         SET is_read = true, read_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND user_id = $2 AND is_read = false`,
        [companyId, userId],
      );

      return { markedCount: res.rowCount };
    });
  }
}
