import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RoleName } from '../../common/domain/roles';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

export const ROLES_KEY = 'roles';
export const ALLOW_WITHOUT_PROFILE_KEY = 'allowWithoutProfile';

/**
 * Requires a valid token and, when roles are given, at least one of them.
 * With no roles, any user that has a profile is accepted.
 */
export function Auth(...roles: RoleName[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}

/** Requires a valid token only; users with no profile are accepted. */
export function AuthWithoutProfile() {
  return applyDecorators(
    SetMetadata(ALLOW_WITHOUT_PROFILE_KEY, true),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}
