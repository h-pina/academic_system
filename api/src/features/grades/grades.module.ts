import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from './entities/assessment.entity';
import { Grade } from './entities/grade.entity';
import { GradeReopening } from './entities/grade-reopening.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { ClassesModule } from '../classes/classes.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { SettingsModule } from '../settings/settings.module';
import { User } from '../users/entities/user.entity';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { ResultsService } from './results.service';

@Module({
  imports: [
    ClassesModule,
    EnrollmentsModule,
    SettingsModule,
    TypeOrmModule.forFeature([Assessment, Grade, GradeReopening, AttendanceRecord, User]),
  ],
  controllers: [GradesController],
  providers: [GradesService, ResultsService],
  exports: [TypeOrmModule, GradesService, ResultsService],
})
export class GradesModule {}
