import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(1)
  roleId: number;
}
