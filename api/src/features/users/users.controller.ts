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
} from '@nestjs/common';
import { Auth, AuthWithoutProfile } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Auth('admin')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /** Users with no staff, teacher or student profile ("without link"). */
  @Auth('admin')
  @Get('orphans')
  findWithoutProfile() {
    return this.usersService.findWithoutProfile();
  }

  @Auth('admin', 'secretary')
  @Get(':cpf/exists')
  async exists(@Param('cpf') cpf: string) {
    return { exists: await this.usersService.exists(cpf) };
  }

  @Get(':cpf/email')
  async getEmail(@Param('cpf') cpf: string) {
    return { email: await this.usersService.getEmail(cpf) };
  }

  @Auth('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @AuthWithoutProfile()
  @Put('me')
  updateOwnProfile(@CurrentUser() cpf: string, @Body() dto: UpdateOwnProfileDto) {
    return this.usersService.updateOwnProfile(cpf, dto);
  }

  @Auth('admin')
  @Put(':cpf')
  updateDetails(@Param('cpf') cpf: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateDetails(cpf, dto);
  }

  @Auth('admin')
  @Delete(':cpf')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('cpf') cpf: string) {
    return this.usersService.delete(cpf);
  }
}
