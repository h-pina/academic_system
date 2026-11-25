import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from './entities/activity.entity';
import { Submission } from './entities/submission.entity';
import { ClassesModule } from '../classes/classes.module';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { User } from '../users/entities/user.entity';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [ClassesModule, TypeOrmModule.forFeature([Activity, Submission, Enrollment, User])],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [TypeOrmModule],
})
export class ActivitiesModule {}
