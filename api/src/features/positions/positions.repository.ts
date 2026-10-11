import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './entities/position.entity';

@Injectable()
export class PositionsRepository {
  constructor(
    @InjectRepository(Position)
    private readonly positions: Repository<Position>,
  ) {}

  findAll(): Promise<Position[]> {
    return this.positions.find({ order: { name: 'ASC' } });
  }

  findById(id: number): Promise<Position | null> {
    return this.positions.findOne({ where: { id } });
  }

  exists(id: number): Promise<boolean> {
    return this.positions.existsBy({ id });
  }

  async create(name: string): Promise<void> {
    await this.positions.insert({ name });
  }

  async update(id: number, name: string): Promise<void> {
    await this.positions.update({ id }, { name });
  }

  async delete(id: number): Promise<void> {
    await this.positions.delete({ id });
  }
}
