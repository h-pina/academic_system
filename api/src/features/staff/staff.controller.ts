import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';

/** Administrative staff management is restricted to administrators. */
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Auth('admin')
  @Get()
  list(@Query() query: ListStaffQueryDto) {
    return this.staffService.list(query);
  }

  @Auth('admin')
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.get(id);
  }

  @Auth('admin')
  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Auth('admin')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
    @CurrentAuthUser() actor: AuthUser,
  ) {
    return this.staffService.update(id, dto, actor.userId);
  }

  @Auth('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAuthUser() actor: AuthUser,
  ) {
    return this.staffService.remove(id, actor.userId);
  }
}
