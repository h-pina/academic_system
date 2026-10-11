import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../features/users/entities/user.entity';
import { Position } from '../features/positions/entities/position.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Position])],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeedModule {}
