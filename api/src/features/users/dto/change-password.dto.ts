import { IsString, MinLength } from 'class-validator';
import { IsLoginIdentifier } from '../../../common/validators/login-identifier.validator';

export class ResetPasswordDto {
  /** CPF (11 digits) or matrícula (10 digits). */
  @IsLoginIdentifier()
  identifier: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
