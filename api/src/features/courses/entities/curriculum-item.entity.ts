import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Course } from './course.entity';
import { Subject } from '../../subjects/entities/subject.entity';

/** A subject placed in a course's curriculum (matriz curricular). */
@Entity('curriculum_items')
@Unique('UQ_curriculum_items_course_subject', ['courseId', 'subjectId'])
@Check('CHK_curriculum_items_semester', `"semester" >= 1`)
export class CurriculumItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id', type: 'integer' })
  courseId: number;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'subject_id', type: 'integer' })
  subjectId: number;

  /** A subject that is part of a curriculum cannot be deleted. */
  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ type: 'integer' })
  semester: number;

  @Column({ type: 'boolean', default: true })
  mandatory: boolean;
}
