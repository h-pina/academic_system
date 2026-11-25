import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module';
import { GradesModule } from '../grades/grades.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ClassesModule, GradesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
