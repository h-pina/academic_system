import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { LoginRateLimitGuard } from '../../common/security/login-rate-limit.guard';
import { AuthWithoutProfile } from './roles.decorator';
import { CurrentAuthUser } from './current-user.decorator';
import { AuthUser } from './auth-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from '../users/dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LoginRateLimitGuard)
  @Get('access/:identifier')
  checkAccess(@Param('identifier') identifier: string) {
    return this.authService.checkAccess(identifier);
  }

  @UseGuards(LoginRateLimitGuard)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.identifier, dto.password);
  }

  @AuthWithoutProfile()
  @Get('me')
  getProfile(@CurrentAuthUser() user: AuthUser) {
    return this.authService.getProfile(user.userId);
  }

  @UseGuards(LoginRateLimitGuard)
  @Put('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.identifier, dto.newPassword);
  }
}
