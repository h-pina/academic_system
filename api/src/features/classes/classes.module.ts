import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassGroup } from './entities/class-group.entity';
import { ClassSchedule } from './entities/class-schedule.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Semester } from '../calendar/entities/semester.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassGroup,
      ClassSchedule,
      Enrollment,
      Semester,
      Subject,
      Teacher,
    ]),
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [TypeOrmModule, ClassesService],
})
export class ClassesModule {}
