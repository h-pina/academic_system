import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { ClockController } from './clock.controller';

/** `GET /clock` for every screen, and the development-only time travel. */
@Module({ imports: [EnrollmentsModule], controllers: [ClockController] })
export class TimeTravelModule {}
