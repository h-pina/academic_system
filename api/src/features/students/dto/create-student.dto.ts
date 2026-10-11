import { IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';

export class CreateStudentDto {
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
  courseId: number;

  /** Also the year prefix of the matrícula issued to the student. */
  @IsInt()
  @Min(1900)
  @Max(2100)
  entryYear: number;
}
