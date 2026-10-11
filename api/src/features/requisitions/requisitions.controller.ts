import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequisitionsService } from './requisitions.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';

@Controller('requisitions')
@UseGuards(JwtAuthGuard)
export class RequisitionsController {
  constructor(private readonly requisitionsService: RequisitionsService) {}

  @Get()
  findMine(@CurrentUser() cpf: string) {
    return this.requisitionsService.findMine(cpf);
  }

  @Get(':id')
  findOne(
    @CurrentUser() cpf: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.requisitionsService.findOne(cpf, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() cpf: string, @Body() dto: CreateRequisitionDto) {
    return this.requisitionsService.create(cpf, dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  resubmit(
    @CurrentUser() cpf: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequisitionDto,
  ) {
    return this.requisitionsService.resubmit(cpf, id, dto);
  }
}
