import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCalendar } from './entities/academic-calendar.entity';
import { Semester } from './entities/semester.entity';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicCalendar, Semester])],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [TypeOrmModule, CalendarService],
})
export class CalendarModule {}
