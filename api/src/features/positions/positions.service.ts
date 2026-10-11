import { Injectable, NotFoundException } from '@nestjs/common';
import { PositionsRepository } from './positions.repository';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionRecord } from './entities/position.entity';

@Injectable()
export class PositionsService {
  constructor(private readonly positionsRepository: PositionsRepository) {}

  async findAll(): Promise<PositionRecord[]> {
    return this.positionsRepository.findAll();
  }

  async findById(id: number): Promise<PositionRecord> {
    const position = await this.positionsRepository.findById(id);
    if (!position) {
      throw new NotFoundException('Position not found');
    }
    return position;
  }

  async create(dto: CreatePositionDto): Promise<void> {
    await this.positionsRepository.create(dto.name);
  }

  async update(id: number, dto: UpdatePositionDto): Promise<void> {
    await this.ensureExists(id);
    await this.positionsRepository.update(id, dto.name);
  }

  async delete(id: number): Promise<void> {
    await this.ensureExists(id);
    await this.positionsRepository.delete(id);
  }

  private async ensureExists(id: number): Promise<void> {
    if (!(await this.positionsRepository.exists(id))) {
      throw new NotFoundException('Position not found');
    }
  }
}
