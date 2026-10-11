import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { STAFF_ROLES, StaffRole } from '../../../common/domain/domain.constants';
import { IsCpf } from '../../../common/validators/cpf.validator';

export class CreateStaffDto {
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

  @IsIn(STAFF_ROLES)
  role: StaffRole;
}
