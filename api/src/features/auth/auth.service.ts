import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { sanitizeCpf } from '../../common/utils/cpf.util';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.saltRounds = Number(config.get('BCRYPT_SALT_ROUNDS') ?? 12);
  }

  async checkAccess(cpf: string): Promise<{ hasPassword: boolean; name: string }> {
    const user = await this.usersRepository.findByCpf(sanitizeCpf(cpf));
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { hasPassword: user.passwordHash !== null, name: user.name };
  }

  async login(cpf: string, password: string): Promise<{ accessToken: string }> {
    const sanitizedCpf = sanitizeCpf(cpf);
    const user = await this.usersRepository.findByCpf(sanitizedCpf);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid CPF or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid CPF or password');
    }

    const accessToken = await this.jwtService.signAsync({ sub: sanitizedCpf });
    return { accessToken };
  }

  async getProfile(cpf: string): Promise<{ cpf: string; name: string; roleId: number }> {
    const user = await this.usersRepository.findByCpf(cpf);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { cpf: user.cpf, name: user.name, roleId: user.roleId };
  }

  async resetPassword(cpf: string, newPassword: string): Promise<void> {
    const sanitizedCpf = sanitizeCpf(cpf);
    if (!(await this.usersRepository.exists(sanitizedCpf))) {
      throw new NotFoundException('User not found');
    }
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    await this.usersRepository.updatePassword(sanitizedCpf, passwordHash);
  }
}
