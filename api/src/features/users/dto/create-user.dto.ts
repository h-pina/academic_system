import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';

export class CreateUserDto {
  @IsCpf()
  cpf: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
