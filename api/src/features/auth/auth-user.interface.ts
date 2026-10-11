import { RoleName } from '../../common/domain/roles';

/** The authenticated user attached to `request.user` by `JwtStrategy`. */
export interface AuthUser {
  userId: number;
  cpf: string;
  roles: RoleName[];
}
