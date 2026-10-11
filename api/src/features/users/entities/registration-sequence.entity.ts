import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Last registration-number sequence issued for each year. Incremented inside
 * the transaction that creates a user, so a number is never reused, even if
 * the user holding the highest number is later deleted.
 */
@Entity('registration_sequences')
@Check(
  'CHK_registration_sequences_last_number',
  `"last_number" BETWEEN 0 AND 999999`,
)
export class RegistrationSequence {
  @PrimaryColumn({ type: 'integer' })
  year: number;

  @Column({ name: 'last_number', type: 'integer', default: 0 })
  lastNumber: number;
}
