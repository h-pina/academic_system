import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { GradesService } from './grades.service';
import {
  ApproveReopeningDto,
  CreateAssessmentDto,
  PostGradesDto,
  RequestReopeningDto,
} from './dto/grades.dto';

@Controller()
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  @Auth('secretary', 'teacher')
  @Get('classes/:classId/assessments')
  listAssessments(@Param('classId', ParseIntPipe) classId: number, @CurrentAuthUser() user: AuthUser) {
    return this.grades.listAssessments(user, classId);
  }

  @Auth('teacher')
  @Post('classes/:classId/assessments')
  createAssessment(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: CreateAssessmentDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.grades.createAssessment(user, classId, dto);
  }

  @Auth('teacher')
  @Delete('assessments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAssessment(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.grades.removeAssessment(user, id);
  }

  @Auth('teacher')
  @Put('assessments/:id/grades')
  postGrades(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostGradesDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.grades.postGrades(user, id, dto);
  }

  @Auth('secretary', 'teacher')
  @Get('classes/:classId/grades')
  classGrades(@Param('classId', ParseIntPipe) classId: number, @CurrentAuthUser() user: AuthUser) {
    return this.grades.classGrades(user, classId);
  }

  @Auth('secretary', 'teacher')
  @Post('classes/:classId/finalize')
  @HttpCode(HttpStatus.OK)
  finalize(@Param('classId', ParseIntPipe) classId: number, @CurrentAuthUser() user: AuthUser) {
    return this.grades.finalize(user, classId);
  }

  @Auth('secretary', 'teacher')
  @Post('classes/:classId/grade-reopenings')
  requestReopening(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: RequestReopeningDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.grades.requestReopening(user, classId, dto);
  }

  @Auth('secretary', 'teacher')
  @Get('grade-reopenings')
  listReopenings(@CurrentAuthUser() user: AuthUser, @Query('status') status?: string) {
    return this.grades.listReopenings(user, status);
  }

  @Auth('secretary')
  @Post('grade-reopenings/:id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveReopeningDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.grades.decideReopening(user, id, { approve: true, dto });
  }

  @Auth('secretary')
  @Post('grade-reopenings/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.grades.decideReopening(user, id, { approve: false });
  }
}
