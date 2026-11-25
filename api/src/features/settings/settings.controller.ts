import { Body, Controller, Get, Put } from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Auth()
  @Get()
  get() {
    return this.settings.get();
  }

  @Auth('admin')
  @Put()
  async update(@Body() dto: UpdateSettingsDto, @CurrentAuthUser() user: AuthUser) {
    const result = await this.settings.setMinPassingGrade(dto.minPassingGrade);
    await this.audit.log(user.userId, 'settings.update', 'settings', null, {
      minPassingGrade: dto.minPassingGrade,
    });
    return result;
  }
}
