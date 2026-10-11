import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from './entities/user.entity';
import { RegistrationSequence } from './entities/registration-sequence.entity';
import { sanitizeCpf } from '../../common/utils/cpf.util';

export interface PersonInput {
  cpf: string;
  name?: string;
  email?: string;
}

const MAX_SEQUENCE = 999_999;

/**
 * Shared by the APIs that create a person together with a profile (students,
 * teachers, staff). Every method takes the `EntityManager` of the caller's
 * transaction so the whole operation commits or rolls back as one.
 */
@Injectable()
export class UserProvisioningService {
  /**
   * Returns the user with this CPF, creating a user without password (set at
   * first access) when none exists. An existing user is reused untouched.
   */
  async findOrCreate(
    manager: EntityManager,
    input: PersonInput,
  ): Promise<{ user: User; created: boolean }> {
    const users = manager.getRepository(User);
    const cpf = sanitizeCpf(input.cpf);

    const existing = await users.findOneBy({ cpf });
    if (existing) {
      return { user: existing, created: false };
    }

    const name = input.name?.trim();
    const email = input.email?.trim();
    if (!name || !email) {
      throw new BadRequestException(
        'name and email are required when the CPF is not registered yet',
      );
    }
    if (await users.existsBy({ email })) {
      throw new ConflictException('A user with this e-mail is already registered');
    }

    const user = await users.save(
      users.create({
        cpf,
        name,
        email,
        registrationNumber: null,
        passwordHash: null,
        active: true,
      }),
    );
    return { user, created: true };
  }

  /**
   * Gives the user a registration number (matrícula) for `year`, unless they
   * already have one. The per-year counter is advanced in the caller's
   * transaction, so a number is never issued twice nor reused.
   */
  async ensureRegistrationNumber(
    manager: EntityManager,
    user: User,
    year: number,
  ): Promise<string> {
    if (user.registrationNumber) {
      return user.registrationNumber;
    }

    const sequences = manager.getRepository(RegistrationSequence);
    const sequence =
      (await sequences.findOneBy({ year })) ??
      sequences.create({ year, lastNumber: 0 });

    if (sequence.lastNumber >= MAX_SEQUENCE) {
      throw new ConflictException(
        `No registration numbers left for year ${year}`,
      );
    }
    sequence.lastNumber += 1;
    await sequences.save(sequence);

    const registrationNumber = `${year}${String(sequence.lastNumber).padStart(6, '0')}`;
    await manager
      .getRepository(User)
      .update({ id: user.id }, { registrationNumber });
    user.registrationNumber = registrationNumber;
    return registrationNumber;
  }
}
