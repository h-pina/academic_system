import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
  CPF_LENGTH,
  REGISTRATION_NUMBER_LENGTH,
} from '../../../common/domain/domain.constants';

/**
 * Identity and credentials of every person in the system. Profiles
 * (staff, teacher, student) are 1:1 extensions keyed by `users.id`.
 */
@Entity('users')
@Check(
  'CHK_users_cpf',
  `length("cpf") = ${CPF_LENGTH} AND "cpf" NOT GLOB '*[^0-9]*'`,
)
@Check(
  'CHK_users_registration_number',
  `"registration_number" IS NULL OR (length("registration_number") = ${REGISTRATION_NUMBER_LENGTH} AND "registration_number" NOT GLOB '*[^0-9]*')`,
)
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: CPF_LENGTH, unique: true })
  cpf: string;

  /** Matrícula used to log in; `YYYY` + 6 digits. Optional. */
  @Column({
    name: 'registration_number',
    type: 'varchar',
    length: REGISTRATION_NUMBER_LENGTH,
    unique: true,
    nullable: true,
  })
  registrationNumber: string | null;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  /**
   * Transitional: replaced by roles derived from staff/teachers/students
   * in task 02, which removes this column.
   */
  @Column({ name: 'role_id', type: 'integer' })
  roleId: number;

  @Column({ name: 'password_hash', type: 'varchar', length: 60, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

export type UserRecord = User;

export type PublicUser = Omit<User, 'passwordHash'>;
