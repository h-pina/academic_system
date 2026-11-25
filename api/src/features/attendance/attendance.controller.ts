import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto, RecordAttendanceDto } from './dto/attendance.dto';

@Controller('classes/:classId/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Auth('teacher')
  @Put()
  record(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: RecordAttendanceDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.attendance.record(user, classId, dto);
  }

  @Auth('secretary', 'teacher')
  @Get()
  roll(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: AttendanceQueryDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.attendance.roll(user, classId, query.date);
  }
}
