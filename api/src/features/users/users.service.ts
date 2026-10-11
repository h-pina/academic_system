import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { PublicUser, UserRecord } from './entities/user.entity';
import { sanitizeCpf } from '../../common/utils/cpf.util';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../../common/domain/roles';

@Injectable()
export class UsersService {
  private readonly saltRounds: number;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
    config: ConfigService,
  ) {
    this.saltRounds = Number(config.get('BCRYPT_SALT_ROUNDS') ?? 12);
  }

  async findAll(): Promise<UserWithRoles[]> {
    const users = await this.usersRepository.findAll();
    const roles = await this.rolesService.resolveRolesFor(
      users.map((user) => user.id),
    );
    return users.map((user) => ({
      ...toPublicUser(user),
      roles: roles.get(user.id) ?? [],
    }));
  }

  async findWithoutProfile(): Promise<PublicUser[]> {
    const users = await this.usersRepository.findWithoutProfile();
    return users.map(toPublicUser);
  }

  async exists(cpf: string): Promise<boolean> {
    return this.usersRepository.exists(sanitizeCpf(cpf));
  }

  async getEmail(cpf: string): Promise<string> {
    const email = await this.usersRepository.findEmailByCpf(sanitizeCpf(cpf));
    if (!email) {
      throw new NotFoundException('User email not found');
    }
    return email;
  }

  async create(dto: CreateUserDto): Promise<void> {
    const cpf = sanitizeCpf(dto.cpf);

    if (await this.usersRepository.exists(cpf)) {
      throw new ConflictException('A user with this CPF is already registered');
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, this.saltRounds)
      : null;

    await this.usersRepository.create({
      cpf,
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
  }

  async updateDetails(cpf: string, dto: UpdateUserDto): Promise<void> {
    const sanitizedCpf = sanitizeCpf(cpf);
    await this.ensureExists(sanitizedCpf);
    await this.usersRepository.updateDetails(sanitizedCpf, dto);
  }

  async updateOwnProfile(cpf: string, dto: UpdateOwnProfileDto): Promise<void> {
    const user = await this.usersRepository.findByCpf(cpf);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await this.resolvePasswordChange(user, dto);

    await this.usersRepository.updateOwnProfile(cpf, {
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
  }

  async delete(cpf: string): Promise<void> {
    const sanitizedCpf = sanitizeCpf(cpf);
    await this.ensureExists(sanitizedCpf);
    await this.usersRepository.delete(sanitizedCpf);
  }

  private async resolvePasswordChange(
    user: UserRecord,
    dto: UpdateOwnProfileDto,
  ): Promise<string | undefined> {
    if (!dto.currentPassword || !dto.newPassword) {
      return undefined;
    }

    if (!user.passwordHash) {
      throw new BadRequestException('User does not have a password set yet');
    }

    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    return bcrypt.hash(dto.newPassword, this.saltRounds);
  }

  private async ensureExists(cpf: string): Promise<void> {
    if (!(await this.usersRepository.exists(cpf))) {
      throw new NotFoundException('User not found');
    }
  }
}

export type UserWithRoles = PublicUser & { roles: RoleName[] };

function toPublicUser(user: UserRecord): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
