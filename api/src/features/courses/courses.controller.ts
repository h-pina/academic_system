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
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  ListCoursesQueryDto,
  UpdateCourseDto,
} from './dto/course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /** Any user with a profile can read courses. */
  @Auth()
  @Get()
  list(@Query() query: ListCoursesQueryDto) {
    return this.coursesService.list(query);
  }

  @Auth()
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.get(id);
  }

  @Auth('admin', 'secretary')
  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Auth('admin', 'secretary')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Auth('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.remove(id);
  }
}
