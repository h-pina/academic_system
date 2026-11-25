import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Delete,
} from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { EnrollDto, ListMyEnrollmentsQueryDto } from './dto/enrollment.dto';
import { EnrollmentsService } from './enrollments.service';

@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Auth('student')
  @Post('enrollments')
  enroll(@Body() dto: EnrollDto, @CurrentAuthUser() user: AuthUser) {
    return this.enrollments.enroll(user, dto.classId);
  }

  @Auth('student')
  @Get('enrollments/me')
  mine(@CurrentAuthUser() user: AuthUser, @Query() query: ListMyEnrollmentsQueryDto) {
    return this.enrollments.listMine(user, query);
  }

  /** Cancels the enrollment (frees the seat). */
  @Auth('student')
  @Delete('enrollments/:id')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.enrollments.withdraw(user, id, 'cancelled');
  }

  @Auth('student')
  @Post('enrollments/:id/lock')
  @HttpCode(HttpStatus.OK)
  lock(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.enrollments.withdraw(user, id, 'locked');
  }

  /** Decides the seats after the enrollment period ends (RN03). */
  @Auth('secretary')
  @Post('semesters/:id/allocate')
  @HttpCode(HttpStatus.OK)
  allocate(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.enrollments.allocate(id, user.userId);
  }

  @Auth('secretary', 'teacher')
  @Get('classes/:classId/enrollments')
  roster(@Param('classId', ParseIntPipe) classId: number, @CurrentAuthUser() user: AuthUser) {
    return this.enrollments.roster(user, classId);
  }
}
