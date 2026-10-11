import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 11 })
  cpf: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  @Column({ name: 'role_id', type: 'integer' })
  roleId: number;

  @Column({ name: 'password_hash', type: 'varchar', length: 60, nullable: true })
  passwordHash: string | null;
}

export type UserRecord = User;

export type PublicUser = Omit<User, 'passwordHash'>;
