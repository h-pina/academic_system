import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  STUDENT_STATUSES,
  StudentStatus,
} from '../../../common/domain/domain.constants';

export class UpdateStudentDto {
  @IsOptional()
  @IsInt()
  courseId?: number;

  /** Changing it does not change the matrícula already issued. */
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  entryYear?: number;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: StudentStatus;
}
