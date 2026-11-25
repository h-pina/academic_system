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
import { CalendarService } from './calendar.service';
import {
  CreateCalendarDto,
  CreateSemesterDto,
  ListSemestersQueryDto,
  UpdateCalendarDto,
} from './dto/calendar.dto';

@Controller()
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  /** The calendar is readable by every user with a profile (UCs02). */
  @Auth()
  @Get('calendars')
  listCalendars() {
    return this.calendar.listCalendars();
  }

  @Auth()
  @Get('calendars/:id')
  getCalendar(@Param('id', ParseIntPipe) id: number) {
    return this.calendar.getCalendar(id);
  }

  @Auth('secretary')
  @Post('calendars')
  createCalendar(@Body() dto: CreateCalendarDto, @CurrentAuthUser() user: AuthUser) {
    return this.calendar.createCalendar(dto, user.userId);
  }

  @Auth('secretary')
  @Patch('calendars/:id')
  updateCalendar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.calendar.updateCalendar(id, dto, user.userId);
  }

  @Auth('admin')
  @Delete('calendars/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCalendar(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.calendar.removeCalendar(id, user.userId);
  }

  @Auth()
  @Get('semesters')
  listSemesters(@Query() query: ListSemestersQueryDto) {
    return this.calendar.listSemesters(query);
  }

  @Auth()
  @Get('semesters/:id')
  getSemester(@Param('id', ParseIntPipe) id: number) {
    return this.calendar.getSemester(id);
  }

  @Auth('secretary')
  @Post('semesters')
  createSemester(@Body() dto: CreateSemesterDto, @CurrentAuthUser() user: AuthUser) {
    return this.calendar.createSemester(dto, user.userId);
  }

  @Auth('secretary')
  @Post('semesters/:id/deploy')
  @HttpCode(HttpStatus.OK)
  deploy(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.calendar.deploy(id, user.userId);
  }

  @Auth('secretary')
  @Post('semesters/:id/close')
  @HttpCode(HttpStatus.OK)
  close(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.calendar.close(id, user.userId);
  }
}
