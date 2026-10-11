import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { RequisitionsController } from './requisitions.controller';
import { RequisitionsService } from './requisitions.service';
import { RequisitionsRepository } from './requisitions.repository';
import { MaterialRequisition } from './entities/requisition.entity';
import { MaterialRequisitionItem } from './entities/requisition-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaterialRequisition, MaterialRequisitionItem]),
    UsersModule,
  ],
  controllers: [RequisitionsController],
  providers: [RequisitionsService, RequisitionsRepository],
  exports: [RequisitionsService, RequisitionsRepository],
})
export class RequisitionsModule {}
