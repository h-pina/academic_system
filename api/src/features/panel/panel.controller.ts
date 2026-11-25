import { Controller, Get } from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { PanelService } from './panel.service';

@Controller('me')
export class PanelController {
  constructor(private readonly panel: PanelService) {}

  @Auth('student')
  @Get('academic-panel')
  academicPanel(@CurrentAuthUser() user: AuthUser) {
    return this.panel.forStudent(user);
  }
}
