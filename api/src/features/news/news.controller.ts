import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../auth/roles.decorator';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { CreateNewsDto, ListNewsQueryDto, UpdateNewsDto } from './dto/news.dto';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Auth()
  @Get()
  list(@CurrentAuthUser() user: AuthUser, @Query() query: ListNewsQueryDto) {
    return this.news.list(user, query);
  }

  @Auth('teacher', 'secretary')
  @Post()
  create(@Body() dto: CreateNewsDto, @CurrentAuthUser() user: AuthUser) {
    return this.news.create(user, dto);
  }

  @Auth('teacher', 'secretary')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsDto,
    @CurrentAuthUser() user: AuthUser,
  ) {
    return this.news.update(user, id, dto);
  }

  @Auth('teacher', 'secretary')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentAuthUser() user: AuthUser) {
    return this.news.remove(user, id);
  }
}
