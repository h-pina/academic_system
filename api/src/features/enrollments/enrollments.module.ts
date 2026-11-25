import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { Semester } from '../calendar/entities/semester.entity';
import { ClassesModule } from '../classes/classes.module';
import { CurriculumItem } from '../courses/entities/curriculum-item.entity';
import { Student } from '../students/entities/student.entity';
import { SubjectPrerequisite } from '../subjects/entities/subject-prerequisite.entity';
import { User } from '../users/entities/user.entity';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [
    ClassesModule,
    TypeOrmModule.forFeature([Enrollment, Semester, CurriculumItem, Student, SubjectPrerequisite, User]),
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [TypeOrmModule, EnrollmentsService],
})
export class EnrollmentsModule {}
