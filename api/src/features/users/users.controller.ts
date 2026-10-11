import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':cpf/exists')
  async exists(@Param('cpf') cpf: string) {
    return { exists: await this.usersService.exists(cpf) };
  }

  @Get(':cpf/email')
  async getEmail(@Param('cpf') cpf: string) {
    return { email: await this.usersService.getEmail(cpf) };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  updateOwnProfile(@CurrentUser() cpf: string, @Body() dto: UpdateOwnProfileDto) {
    return this.usersService.updateOwnProfile(cpf, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':cpf')
  updateDetails(@Param('cpf') cpf: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateDetails(cpf, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':cpf')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('cpf') cpf: string) {
    return this.usersService.delete(cpf);
  }
}
