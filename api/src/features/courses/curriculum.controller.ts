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
} from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurriculumService } from './curriculum.service';
import {
  AddCurriculumItemDto,
  UpdateCurriculumItemDto,
} from './dto/curriculum.dto';

@Controller('courses/:courseId/curriculum')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  /** Any user with a profile can read a curriculum. */
  @Auth()
  @Get()
  get(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.curriculumService.get(courseId);
  }

  @Auth('admin', 'secretary')
  @Post()
  add(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: AddCurriculumItemDto,
  ) {
    return this.curriculumService.add(courseId, dto);
  }

  @Auth('admin', 'secretary')
  @Patch(':subjectId')
  update(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('subjectId', ParseIntPipe) subjectId: number,
    @Body() dto: UpdateCurriculumItemDto,
  ) {
    return this.curriculumService.update(courseId, subjectId, dto);
  }

  @Auth('admin', 'secretary')
  @Delete(':subjectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('subjectId', ParseIntPipe) subjectId: number,
  ) {
    return this.curriculumService.remove(courseId, subjectId);
  }
}
