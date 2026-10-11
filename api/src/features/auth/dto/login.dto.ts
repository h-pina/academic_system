import { IsString, MinLength } from 'class-validator';
import { IsLoginIdentifier } from '../../../common/validators/login-identifier.validator';

export class LoginDto {
  /** CPF (11 digits) or matrícula (10 digits); punctuation is ignored. */
  @IsLoginIdentifier()
  identifier: string;

  @IsString()
  @MinLength(1)
  password: string;
}
