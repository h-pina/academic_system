import {
  Body,
  Controller,
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
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { ClassesService } from './classes.service';
import {
  CreateClassDto,
  ListClassesQueryDto,
  RejectClassDto,
  RequestClassDto,
  SetSchedulesDto,
  UpdateClassDto,
} from './dto/class.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  /** Staff see every class; teachers see the ones they teach or requested. */
  @Auth('secretary', 'teacher')
  @Get()
  list(@CurrentAuthUser() user: AuthUser, @Query() query: ListClassesQueryDto) {
    return this.classes.list(user, query);
  }

  /** Catalogue of classes open for enrollment (UC02). */
  @Auth()
  @Get('available')
  available(@CurrentAuthUser() user: AuthUser, @Query() query: ListClassesQueryDto) {
    return this.classes.available(user, query);
  }

  @Auth('teacher')
  @Post('requests')
  request(@Body() dto: RequestClassDto, @CurrentAuthUser() user: AuthUser) {
    return this.classes.request(dto, user);
  }

  @Auth()
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.classes.get(id, user);
  }

  @Auth('secretary')
  @Post()
  create(@Body() dto: CreateClassDto, @CurrentAuthUser() user: AuthUser) {
    return this.classes.create(dto, user);
  }

  @Auth('secretary')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.classes.update(id, dto, user);
  }

  @Auth('secretary')
  @Put(':id/schedules')
  setSchedules(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetSchedulesDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.classes.setSchedules(id, dto, user);
  }

  @Auth('secretary')
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.classes.approve(id, user);
  }

  @Auth('secretary')
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectClassDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.classes.reject(id, dto, user);
  }
}
