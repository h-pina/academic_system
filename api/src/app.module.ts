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
import { SeedModule } from './seed/seed.module';

@Module({
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
