import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from './entities/staff.entity';
import { UsersModule } from '../users/users.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Staff]), UsersModule],
  controllers: [StaffController],
  providers: [StaffService, StaffRepository],
  exports: [TypeOrmModule, StaffService],
})
export class StaffModule {}
