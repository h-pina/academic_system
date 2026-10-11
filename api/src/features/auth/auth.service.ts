import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../../common/domain/roles';
import { resolveLoginIdentifier } from '../../common/utils/identifier.util';

export interface AuthProfile {
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
      throw new UnauthorizedException('CPF, matrícula ou senha inválidos');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
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
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    await this.usersRepository.updatePassword(user.cpf, passwordHash);
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
