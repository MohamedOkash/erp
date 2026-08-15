import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      // Also allow x-tenant-id header for development/testing if token not provided, but prioritize session token
      const tenantId = request.headers['x-company-id'] || request.headers['x-tenant-id'];
      if (tenantId) {
        request.user = {
          userId: '00000000-0000-0000-0003-000000000001',
          companyId: tenantId,
          username: 'system',
          fullName: 'System / Test User',
          roles: [{ roleName: 'System Admin', roleCode: 'company_admin', scopeType: 'company' }],
          permissions: ['*'],
        };
        return true;
      }
      throw new UnauthorizedException('Authentication token or tenant header missing');
    }

    const user = await this.authService.validateSession(token);
    request.user = user;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return request.headers['x-session-token'];
  }
}
