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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { ActivitiesService, MAX_UPLOAD_BYTES } from './activities.service';
import {
  CreateActivityDto,
  SubmitActivityDto,
  UpdateActivityDto,
} from './dto/activity.dto';

@Controller()
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Auth('teacher')
  @Post('classes/:classId/activities')
  create(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: CreateActivityDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.activities.create(user, classId, dto);
  }

  @Auth('teacher', 'student', 'secretary')
  @Get('classes/:classId/activities')
  list(@Param('classId', ParseIntPipe) classId: number, @CurrentAuthUser() user: AuthUser) {
    return this.activities.listForClass(user, classId);
  }

  @Auth('teacher')
  @Patch('activities/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivityDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.activities.update(user, id, dto);
  }

  @Auth('teacher')
  @Delete('activities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.activities.remove(user, id);
  }

  /** Multipart: optional `answerText` field and optional `file` part. */
  @Auth('student')
  @Post('activities/:id/submissions')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitActivityDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.activities.submit(user, id, dto.answerText, file);
  }

  @Auth('student')
  @Get('activities/:id/submissions/me')
  mine(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.activities.mySubmission(user, id);
  }

  @Auth('teacher', 'secretary')
  @Get('activities/:id/submissions')
  submissions(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.activities.listSubmissions(user, id);
  }

  @Auth()
  @Get('submissions/:id/file')
  async file(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAuthUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const file = await this.activities.fileOf(user, id);
    res.download(file.path, file.name);
  }
}
