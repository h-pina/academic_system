import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { ClassSchedule } from '../classes/entities/class-schedule.entity';
import { ClassesModule } from '../classes/classes.module';
import { GradesModule } from '../grades/grades.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [ClassesModule, GradesModule, TypeOrmModule.forFeature([AttendanceRecord, ClassSchedule])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
