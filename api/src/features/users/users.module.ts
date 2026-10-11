import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { RolesModule } from '../roles/roles.module';
import { RegistrationSequence } from './entities/registration-sequence.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RegistrationSequence]), RolesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
