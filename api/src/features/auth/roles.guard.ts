import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName, hasAnyRole } from '../../common/domain/roles';
import { AuthUser } from './auth-user.interface';
import { ALLOW_WITHOUT_PROFILE_KEY, ROLES_KEY } from './roles.decorator';

/**
 * Runs after `JwtAuthGuard`. Rules:
 * - routes marked `AuthWithoutProfile` accept any authenticated user;
 * - a user with no profile (empty roles) is denied everywhere else;
 * - `@Auth()` with no roles accepts any user that has a profile;
 * - `@Auth(...roles)` requires at least one of the roles (`admin` includes
 *   `secretary`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    const allowWithoutProfile = this.reflector.getAllAndOverride<boolean>(
      ALLOW_WITHOUT_PROFILE_KEY,
      targets,
    );
    if (allowWithoutProfile) {
      return true;
    }

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user || user.roles.length === 0) {
      throw new ForbiddenException(
        'Your account has no profile linked yet. Contact the secretary.',
      );
    }

    const required =
      this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, targets) ?? [];
    if (required.length > 0 && !hasAnyRole(user.roles, required)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }
    return true;
  }
}
