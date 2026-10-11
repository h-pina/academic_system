import { IsIn, IsInt, IsOptional } from 'class-validator';
import {
  PROFILE_STATUSES,
  ProfileStatus,
  TEACHER_TITLES,
  TeacherTitle,
} from '../../../common/domain/domain.constants';

export class UpdateTeacherDto {
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsIn(TEACHER_TITLES)
  title?: TeacherTitle;

  @IsOptional()
  @IsIn(PROFILE_STATUSES)
  status?: ProfileStatus;
}
