import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../features/users/entities/user.entity';
import { RegistrationSequence } from '../features/users/entities/registration-sequence.entity';
import { Staff } from '../features/staff/entities/staff.entity';
import { Teacher } from '../features/teachers/entities/teacher.entity';
import { Student } from '../features/students/entities/student.entity';
import { Department } from '../features/departments/entities/department.entity';
import { Course } from '../features/courses/entities/course.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RegistrationSequence,
      Staff,
      Teacher,
      Student,
      Department,
      Course,
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeedModule {}
