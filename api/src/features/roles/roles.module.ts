import { Module } from '@nestjs/common';
import { StaffModule } from '../staff/staff.module';
import { TeachersModule } from '../teachers/teachers.module';
import { StudentsModule } from '../students/students.module';
import { RolesService } from './roles.service';

@Module({
  imports: [StaffModule, TeachersModule, StudentsModule],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
