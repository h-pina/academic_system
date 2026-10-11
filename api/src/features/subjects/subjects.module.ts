import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { SubjectPrerequisite } from './entities/subject-prerequisite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subject, SubjectPrerequisite])],
  exports: [TypeOrmModule],
})
export class SubjectsModule {}
