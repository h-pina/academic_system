import { IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import {
  TEACHER_TITLES,
  TeacherTitle,
} from '../../../common/domain/domain.constants';
import { IsCpf } from '../../../common/validators/cpf.validator';

export class CreateTeacherDto {
  @IsCpf()
  cpf: string;

  /** Required when the CPF is not registered yet; ignored otherwise. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  /** Required when the CPF is not registered yet; ignored otherwise. */
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsInt()
  departmentId: number;

  @IsIn(TEACHER_TITLES)
  title: TeacherTitle;
}
