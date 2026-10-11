import { Check, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Subject } from './subject.entity';

/** `subject` requires `prerequisite` to be completed first. */
@Entity('subject_prerequisites')
@Check(
  'CHK_subject_prerequisites_not_self',
  `"subject_id" <> "prerequisite_id"`,
)
export class SubjectPrerequisite {
  @PrimaryColumn({ name: 'subject_id', type: 'integer' })
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @PrimaryColumn({ name: 'prerequisite_id', type: 'integer' })
  prerequisiteId: number;

  /** A subject that is a prerequisite of another cannot be deleted. */
  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'prerequisite_id' })
  prerequisite: Subject;
}
