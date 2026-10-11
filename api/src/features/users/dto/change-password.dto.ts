import { IsString, MinLength } from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';

export class ResetPasswordDto {
  @IsCpf()
  cpf: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
