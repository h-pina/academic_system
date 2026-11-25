import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import {
  DEFAULT_MIN_PASSING_GRADE,
  MAX_ABSENCE_PERCENT,
} from '../../common/domain/domain.constants';

const MIN_GRADE_KEY = 'min_passing_grade';

export interface InstitutionSettings {
  minPassingGrade: number;
  maxAbsencePercent: number;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly settings: Repository<Setting>,
  ) {}

  async get(): Promise<InstitutionSettings> {
    const row = await this.settings.findOneBy({ key: MIN_GRADE_KEY });
    return {
      minPassingGrade: row ? Number(row.value) : DEFAULT_MIN_PASSING_GRADE,
      // Fixed by the specification (RN08), not configurable.
      maxAbsencePercent: MAX_ABSENCE_PERCENT,
    };
  }

  async setMinPassingGrade(value: number): Promise<InstitutionSettings> {
    await this.settings.save({ key: MIN_GRADE_KEY, value: String(value) });
    return this.get();
  }
}
