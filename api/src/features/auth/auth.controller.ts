import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from '../users/dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('access/:cpf')
  checkAccess(@Param('cpf') cpf: string) {
    return this.authService.checkAccess(cpf);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.cpf, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() cpf: string) {
    return this.authService.getProfile(cpf);
  }

  @Put('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.cpf, dto.newPassword);
  }
}
