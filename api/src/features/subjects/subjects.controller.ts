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
  Put,
  Query,
} from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { SubjectsService } from './subjects.service';
import {
  CreateSubjectDto,
  ListSubjectsQueryDto,
  SetPrerequisitesDto,
  UpdateSubjectDto,
} from './dto/subject.dto';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  /** Any user with a profile can read subjects. */
  @Auth()
  @Get()
  list(@Query() query: ListSubjectsQueryDto) {
    return this.subjectsService.list(query);
  }

  @Auth()
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.get(id);
  }

  @Auth('admin', 'secretary')
  @Post()
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Auth('admin', 'secretary')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Auth('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.remove(id);
  }

  @Auth('admin', 'secretary')
  @Put(':id/prerequisites')
  setPrerequisites(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPrerequisitesDto,
  ) {
    return this.subjectsService.setPrerequisites(id, dto);
  }
}
