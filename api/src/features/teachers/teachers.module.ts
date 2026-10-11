import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from './entities/teacher.entity';
import { Department } from '../departments/entities/department.entity';
import { UsersModule } from '../users/users.module';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeachersRepository } from './teachers.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, Department]), UsersModule],
  controllers: [TeachersController],
  providers: [TeachersService, TeachersRepository],
  exports: [TypeOrmModule, TeachersService],
})
export class TeachersModule {}
