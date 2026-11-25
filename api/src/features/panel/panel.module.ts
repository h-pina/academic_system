import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { Submission } from '../activities/entities/submission.entity';
import { ClassGroup } from '../classes/entities/class-group.entity';
import { ClassesModule } from '../classes/classes.module';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { GradesModule } from '../grades/grades.module';
import { NewsPost } from '../news/entities/news-post.entity';
import { SettingsModule } from '../settings/settings.module';
import { PanelController } from './panel.controller';
import { PanelService } from './panel.service';

@Module({
  imports: [
    ClassesModule,
    GradesModule,
    SettingsModule,
    TypeOrmModule.forFeature([Enrollment, ClassGroup, Activity, Submission, NewsPost]),
  ],
  controllers: [PanelController],
  providers: [PanelService],
})
export class PanelModule {}
