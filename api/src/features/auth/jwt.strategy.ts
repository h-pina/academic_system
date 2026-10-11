import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './jwt-payload.interface';
import { AuthUser } from './auth-user.interface';
import { UsersRepository } from '../users/users.repository';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Roles are resolved on every request instead of being stored in the
   * token, so deactivating a user or changing a profile takes effect
   * immediately rather than when the token expires.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const userId = Number(payload.sub);
    const user = Number.isInteger(userId)
      ? await this.usersRepository.findById(userId)
      : null;

    if (!user || !user.active) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      cpf: user.cpf,
      roles: await this.rolesService.resolveRoles(user.id),
    };
  }
}
