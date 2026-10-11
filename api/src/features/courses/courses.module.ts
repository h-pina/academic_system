import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CurriculumItem } from './entities/curriculum-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CurriculumItem])],
  exports: [TypeOrmModule],
})
export class CoursesModule {}
