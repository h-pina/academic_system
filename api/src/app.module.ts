import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './features/users/users.module';
import { AuthModule } from './features/auth/auth.module';
import { StaffModule } from './features/staff/staff.module';
import { TeachersModule } from './features/teachers/teachers.module';
import { StudentsModule } from './features/students/students.module';
import { DepartmentsModule } from './features/departments/departments.module';
import { CoursesModule } from './features/courses/courses.module';
import { SubjectsModule } from './features/subjects/subjects.module';
import { DatabaseModule } from './common/database/database.module';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { ClockModule } from './common/clock/clock.service';
import { AuditModule } from './features/audit/audit.module';
import { SettingsModule } from './features/settings/settings.module';
import { CalendarModule } from './features/calendar/calendar.module';
import { ClassesModule } from './features/classes/classes.module';
import { EnrollmentsModule } from './features/enrollments/enrollments.module';
import { GradesModule } from './features/grades/grades.module';
import { AttendanceModule } from './features/attendance/attendance.module';
import { ActivitiesModule } from './features/activities/activities.module';
import { NewsModule } from './features/news/news.module';
import { PanelModule } from './features/panel/panel.module';
import { ReportsModule } from './features/reports/reports.module';
import { HealthController } from './health/health.controller';
import { TimeTravelModule } from './features/clock/clock.module';
import { SeedModule } from './seed/seed.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3' as const,
        database: config.get<string>('DATABASE_PATH') ?? 'data/app.sqlite',
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    DatabaseModule,
    ClockModule,
    TimeTravelModule,
    AuditModule,
    SettingsModule,
    CalendarModule,
    ClassesModule,
    EnrollmentsModule,
    GradesModule,
    AttendanceModule,
    ActivitiesModule,
    NewsModule,
    PanelModule,
    ReportsModule,
    UsersModule,
    AuthModule,
    StaffModule,
    TeachersModule,
    StudentsModule,
    DepartmentsModule,
    CoursesModule,
    SubjectsModule,
    DashboardModule,
    SeedModule,
  ],
})
export class AppModule {}
