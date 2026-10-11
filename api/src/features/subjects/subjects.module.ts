import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { SubjectPrerequisite } from './entities/subject-prerequisite.entity';
import { CurriculumItem } from '../courses/entities/curriculum-item.entity';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, SubjectPrerequisite, CurriculumItem]),
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [TypeOrmModule, SubjectsService],
})
export class SubjectsModule {}
