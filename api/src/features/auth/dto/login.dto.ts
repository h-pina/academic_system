import { IsString, MinLength } from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';

export class LoginDto {
  @IsCpf()
  cpf: string;

  @IsString()
  @MinLength(1)
  password: string;
}
