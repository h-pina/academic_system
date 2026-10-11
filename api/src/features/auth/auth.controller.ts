import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { AuthWithoutProfile } from './roles.decorator';
import { CurrentAuthUser } from './current-user.decorator';
import { AuthUser } from './auth-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from '../users/dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('access/:identifier')
  checkAccess(@Param('identifier') identifier: string) {
    return this.authService.checkAccess(identifier);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.identifier, dto.password);
  }

  @AuthWithoutProfile()
  @Get('me')
  getProfile(@CurrentAuthUser() user: AuthUser) {
    return this.authService.getProfile(user.userId);
  }

  @Put('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.identifier, dto.newPassword);
  }
}
