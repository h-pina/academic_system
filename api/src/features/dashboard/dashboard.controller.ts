import { Controller, Get } from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Any user with a profile; the sections returned depend on their roles. */
  @Auth()
  @Get()
  get(@CurrentAuthUser() user: AuthUser) {
    return this.dashboardService.forUser(user);
  }
}
