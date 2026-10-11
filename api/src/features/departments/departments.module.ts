import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Course } from '../courses/entities/course.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Course, Teacher])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [TypeOrmModule, DepartmentsService],
})
export class DepartmentsModule {}
