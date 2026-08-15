import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly db: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip, headers, user } = request;

    // Only audit mutating actions (POST, PUT, PATCH, DELETE) or specific access requests
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

    return next.handle().pipe(
      tap({
        next: async (data) => {
          if (isMutating && user?.companyId) {
            try {
              const entityName = this.extractEntityName(url);
              const action = `${method.toUpperCase()} ${url}`;
              const userAgent = headers['user-agent'] || null;

              await this.db.query(
                `INSERT INTO audit_logs (company_id, user_id, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  user.companyId,
                  user.userId || null,
                  action,
                  entityName,
                  data?.id || null,
                  null, // old_values populated by service-level auditing if available
                  body ? JSON.stringify(this.sanitizeBody(body)) : null,
                  ip || null,
                  userAgent,
                ],
              );
            } catch (err) {
              this.logger.error('Failed to record audit log', err);
            }
          }
        },
      }),
    );
  }

  private extractEntityName(url: string): string {
    const cleanPath = url.split('?')[0].replace(/^\/api\/v1\//, '');
    const parts = cleanPath.split('/');
    return parts[0] || 'unknown';
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    if ('password' in sanitized) sanitized.password = '***REDACTED***';
    if ('passwordHash' in sanitized) sanitized.passwordHash = '***REDACTED***';
    return sanitized;
  }
}
