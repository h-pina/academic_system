import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CurriculumItem } from './entities/curriculum-item.entity';
import { Department } from '../departments/entities/department.entity';
import { Student } from '../students/entities/student.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';
import { Subject } from '../subjects/entities/subject.entity';
import { SubjectPrerequisite } from '../subjects/entities/subject-prerequisite.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CurriculumItem,
      Department,
      Student,
      Subject,
      SubjectPrerequisite,
    ]),
  ],
  controllers: [CoursesController, CurriculumController],
  providers: [CoursesService, CurriculumService],
  exports: [TypeOrmModule, CoursesService, CurriculumService],
})
export class CoursesModule {}
