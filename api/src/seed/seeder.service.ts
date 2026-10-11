import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../features/users/entities/user.entity';
import { sanitizeCpf } from '../common/utils/cpf.util';
import { SEED_USERS } from './seed-data';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {
    this.saltRounds = Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 12);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_STANDALONE === 'true') {
      return;
    }

    const optOut = this.config.get<string>('SEED_ON_STARTUP') === 'false';
    const optIn = this.config.get<string>('SEED_ON_STARTUP') === 'true';
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (optOut || (isProduction && !optIn)) {
      return;
    }

    await this.run();
  }

  async run({ force = false }: { force?: boolean } = {}): Promise<void> {
    await this.seedUsers(force);
  }

  private async seedUsers(force: boolean): Promise<void> {
    if (!force && (await this.users.count()) > 0) {
      this.logger.log('users table is not empty - skipping');
      return;
    }

    let created = 0;
    let updated = 0;
    for (const seed of SEED_USERS) {
      const cpf = sanitizeCpf(seed.cpf);
      const passwordHash = seed.password
        ? await bcrypt.hash(seed.password, this.saltRounds)
        : null;
      const row = {
        cpf,
        name: seed.name,
        email: seed.email,
        roleId: seed.roleId,
        passwordHash,
      };

      if (await this.users.findOne({ where: { cpf } })) {
        if (!force) {
          continue;
        }
        await this.users.update({ cpf }, row);
        updated++;
      } else {
        await this.users.insert(row);
        created++;
      }
    }
    this.logger.log(`seeded ${created} user(s), updated ${updated}`);
  }
}
