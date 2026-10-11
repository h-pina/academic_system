import { IsEmail, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateOwnProfileDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @ValidateIf((dto: UpdateOwnProfileDto) => !!dto.newPassword || !!dto.currentPassword)
  @IsString()
  @MinLength(8)
  currentPassword?: string;

  @ValidateIf((dto: UpdateOwnProfileDto) => !!dto.newPassword || !!dto.currentPassword)
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
