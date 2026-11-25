import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../../common/domain/roles';
import { resolveLoginIdentifier } from '../../common/utils/identifier.util';

export interface AuthProfile {
  id: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  roles: RoleName[];
}

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.saltRounds = Number(config.get('BCRYPT_SALT_ROUNDS') ?? 12);
  }

  async checkAccess(
    identifier: string,
  ): Promise<{ hasPassword: boolean; name: string }> {
    const user = await this.findByIdentifier(identifier);
    if (!user || !user.active) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return { hasPassword: user.passwordHash !== null, name: user.name };
  }

  async login(
    identifier: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.findByIdentifier(identifier);

    if (!user || !user.active || !user.passwordHash) {
      await this.auditFailure(user, identifier);
      throw new UnauthorizedException('CPF, matrícula ou senha inválidos');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      await this.auditFailure(user, identifier);
      throw new UnauthorizedException('CPF, matrícula ou senha inválidos');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: String(user.id),
    });
    return { accessToken };
  }

  async getProfile(userId: number): Promise<AuthProfile> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return {
      id: user.id,
      cpf: user.cpf,
      name: user.name,
      email: user.email,
      registrationNumber: user.registrationNumber,
      roles: await this.rolesService.resolveRoles(user.id),
    };
  }

  async resetPassword(identifier: string, newPassword: string): Promise<void> {
    const user = await this.findByIdentifier(identifier);
    if (!user || !user.active) {
      throw new NotFoundException('Usuário não encontrado');
    }
    // This route is public: it may only define the password of an account that
    // has none yet (first access). Changing an existing password needs the
    // current one, through `PUT /users/me/password`.
    if (user.passwordHash !== null) {
      throw new ForbiddenException(
        'Este usuário já possui senha. Use a opção de alterar senha na sua conta.',
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    await this.usersRepository.updatePassword(user.cpf, passwordHash);
    await this.audit.log(user.id, 'auth.first-access', 'user', user.id);
  }

  /** Failed sign-ins are recorded without the full identifier (LGPD). */
  private async auditFailure(user: User | null, identifier: string): Promise<void> {
    const digits = identifier.replace(/\D/g, '');
    await this.audit.log(user?.id ?? null, 'auth.login-failed', 'user', user?.id ?? null, {
      identifier: `***${digits.slice(-3)}`,
    });
  }

  private async findByIdentifier(raw: string): Promise<User | null> {
    const identifier = resolveLoginIdentifier(raw);
    if (!identifier) {
      throw new BadRequestException(
        'Informe um CPF (11 dígitos) ou uma matrícula (10 dígitos) válidos',
      );
    }
    return this.usersRepository.findByIdentifier(identifier);
  }
}
