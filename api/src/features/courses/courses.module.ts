import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CurriculumItem } from './entities/curriculum-item.entity';
import { Department } from '../departments/entities/department.entity';
import { Student } from '../students/entities/student.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CurriculumItem, Department, Student]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [TypeOrmModule, CoursesService],
})
export class CoursesModule {}
