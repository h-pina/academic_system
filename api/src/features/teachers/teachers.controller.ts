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
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { ListTeachersQueryDto } from './dto/list-teachers-query.dto';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Auth('admin', 'secretary', 'teacher')
  @Get()
  list(@Query() query: ListTeachersQueryDto) {
    return this.teachersService.list(query);
  }

  @Auth('admin', 'secretary', 'teacher')
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.get(id);
  }

  @Auth('admin', 'secretary')
  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Auth('admin', 'secretary')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(id, dto);
  }

  @Auth('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.remove(id);
  }
}
