import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Course } from '../courses/entities/course.entity';
import { UsersModule } from '../users/users.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Course]), UsersModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository],
  exports: [TypeOrmModule, StudentsService],
})
export class StudentsModule {}
