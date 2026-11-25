import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { AuthWithoutProfile } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { forbiddenWithCode, ruleViolation } from '../../common/errors/coded-exceptions';
import { isIsoDate } from '../../common/utils/schedule.util';
import { ClockService } from '../../common/clock/clock.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { isTimeTravelEnabled } from './time-travel';

class TravelDto {
  /** Jump to this day (`YYYY-MM-DD`). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  /** Or move the current time by this many days (negative goes back). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-3650)
  @Max(3650)
  days?: number;
}

@Controller('clock')
export class ClockController {
  constructor(
    private readonly clock: ClockService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  /** The server's date: the screens use it instead of the browser's. */
  @AuthWithoutProfile()
  @Get()
  get() {
    return this.state();
  }

  /** Any signed-in user, whatever the profile: it is a development tool. */
  @AuthWithoutProfile()
  @Put()
  async travel(@Body() dto: TravelDto, @CurrentAuthUser() user: AuthUser) {
    this.assertEnabled();
    if ((dto.date === undefined) === (dto.days === undefined)) {
      throw ruleViolation('INVALID_TRAVEL', 'Informe a data ou o número de dias, e apenas um dos dois.');
    }
    if (dto.date !== undefined) {
      const year = Number(dto.date.slice(0, 4));
      if (!isIsoDate(dto.date) || year < 2000 || year > 2100) {
        throw ruleViolation('INVALID_TRAVEL', 'Data inválida.');
      }
      this.clock.travelTo(dto.date);
    } else {
      this.clock.advanceDays(dto.days as number);
    }
    await this.audit.log(user.userId, 'clock.travel', 'clock', null, { ...dto, today: this.clock.today() });
    // A period that just ended gets its seats decided right away.
    await this.enrollments.allocateDueSemesters();
    return this.state();
  }

  @AuthWithoutProfile()
  @Delete()
  @HttpCode(HttpStatus.OK)
  async reset(@CurrentAuthUser() user: AuthUser) {
    this.assertEnabled();
    this.clock.reset();
    await this.audit.log(user.userId, 'clock.reset', 'clock', null);
    return this.state();
  }

  private state() {
    return {
      now: this.clock.now().toISOString(),
      today: this.clock.today(),
      simulated: this.clock.isSimulated(),
      canTravel: isTimeTravelEnabled({ ...process.env, ...this.envOverrides() }),
    };
  }

  private envOverrides(): NodeJS.ProcessEnv {
    return {
      NODE_ENV: this.config.get<string>('NODE_ENV'),
      TIME_TRAVEL: this.config.get<string>('TIME_TRAVEL'),
    };
  }

  private assertEnabled(): void {
    if (!isTimeTravelEnabled({ ...process.env, ...this.envOverrides() })) {
      throw forbiddenWithCode('TIME_TRAVEL_DISABLED', 'A viagem no tempo está desativada neste ambiente.');
    }
  }
}
