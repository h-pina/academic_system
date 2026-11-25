import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Auth } from '../auth/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditService } from './audit.service';

class ListAuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  action?: string;
}

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Auth('admin')
  @Get()
  list(@Query() query: ListAuditQueryDto) {
    return this.audit.list(query, query.page, query.pageSize);
  }
}
