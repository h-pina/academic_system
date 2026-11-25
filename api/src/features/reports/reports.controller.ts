import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import type { Response } from 'express';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { ReportsService } from './reports.service';

class ReportQueryDto {
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format: 'csv' | 'pdf' = 'csv';
}

@Controller('classes/:classId/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Auth('secretary', 'teacher')
  @Get('grades')
  async grades(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: ReportQueryDto,
    @CurrentAuthUser() user: AuthUser,
    @Res() res: Response,
  ) {
    this.send(res, await this.reports.generate(user, classId, 'grades', query.format));
  }

  @Auth('secretary', 'teacher')
  @Get('attendance')
  async attendance(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: ReportQueryDto,
    @CurrentAuthUser() user: AuthUser,
    @Res() res: Response,
  ) {
    this.send(res, await this.reports.generate(user, classId, 'attendance', query.format));
  }

  private send(res: Response, file: { filename: string; contentType: string; body: Buffer | string }) {
    res
      .status(200)
      .setHeader('Content-Type', file.contentType)
      .setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
      .send(file.body);
  }
}
