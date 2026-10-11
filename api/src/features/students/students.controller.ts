import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { hasAnyRole } from '../../common/domain/roles';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Auth('admin', 'secretary', 'teacher')
  @Get()
  list(@Query() query: ListStudentsQueryDto) {
    return this.studentsService.list(query);
  }

  /** Staff and teachers see any student; a student only sees themselves. */
  @Auth('admin', 'secretary', 'teacher', 'student')
  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAuthUser() user: AuthUser,
  ) {
    const seesEveryone = hasAnyRole(user.roles, [
      'admin',
      'secretary',
      'teacher',
    ]);
    if (!seesEveryone && user.userId !== id) {
      throw new ForbiddenException('Students can only see their own record');
    }
    return this.studentsService.get(id);
  }

  @Auth('admin', 'secretary')
  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Auth('admin', 'secretary')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Auth('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}
