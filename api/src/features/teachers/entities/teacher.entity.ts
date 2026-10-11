import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import {
  PROFILE_STATUSES,
  ProfileStatus,
  TEACHER_TITLES,
  TeacherTitle,
  inList,
} from '../../../common/domain/domain.constants';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';

/** Teacher profile; being a teacher means having a row here. */
@Entity('teachers')
@Check('CHK_teachers_title', inList('title', TEACHER_TITLES))
@Check('CHK_teachers_status', inList('status', PROFILE_STATUSES))
export class Teacher {
  @PrimaryColumn({ name: 'user_id', type: 'integer' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'department_id', type: 'integer' })
  departmentId: number;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'varchar', length: 20 })
  title: TeacherTitle;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: ProfileStatus;
}
