import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { NewsPost } from './entities/news-post.entity';
import { CreateNewsDto, ListNewsQueryDto, UpdateNewsDto } from './dto/news.dto';
import { ClassGroup } from '../classes/entities/class-group.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { User } from '../users/entities/user.entity';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { ClockService } from '../../common/clock/clock.service';
import { ACTIVE_ENROLLMENT_STATUSES } from '../../common/domain/domain.constants';
import { hasAnyRole } from '../../common/domain/roles';
import { Paginated } from '../../common/dto/pagination-query.dto';

export interface NewsView {
  id: number;
  title: string;
  body: string;
  classId: number | null;
  authorId: number;
  authorName: string;
  publishedAt: string;
  updatedAt: string;
}

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsPost) private readonly posts: Repository<NewsPost>,
    @InjectRepository(ClassGroup) private readonly classes: Repository<ClassGroup>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly audit: AuditService,
    private readonly clock: ClockService,
  ) {}

  /**
   * RN12: a teacher posts only to their own classes; the Administration to any
   * class or to everyone.
   */
  async create(user: AuthUser, dto: CreateNewsDto): Promise<NewsView> {
    const isStaff = hasAnyRole(user.roles, ['secretary']);
    if (dto.classId === undefined) {
      if (!isStaff) {
        throw new ForbiddenException('Somente a Administração publica avisos para toda a instituição.');
      }
    } else {
      const group = await this.classes.findOneBy({ id: dto.classId });
      if (!group) throw new BadRequestException('Turma não encontrada');
      if (!isStaff && group.teacherId !== user.userId) {
        throw new ForbiddenException('Você só pode publicar nas turmas sob sua responsabilidade.');
      }
    }
    const now = this.clock.now().toISOString();
    const saved = await this.posts.save(
      this.posts.create({
        authorId: user.userId,
        classId: dto.classId ?? null,
        title: dto.title.trim(),
        body: dto.body.trim(),
        publishedAt: now,
        updatedAt: now,
      }),
    );
    await this.audit.log(user.userId, 'news.create', 'news_post', saved.id, { classId: dto.classId ?? null });
    return (await this.toViews([saved]))[0];
  }

  /** News the user is allowed to read (RN11). */
  async list(user: AuthUser, query: ListNewsQueryDto): Promise<Paginated<NewsView>> {
    const builder = this.posts.createQueryBuilder('n');
    if (!hasAnyRole(user.roles, ['secretary'])) {
      const classIds = await this.visibleClassIds(user);
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('n.classId IS NULL').orWhere('n.authorId = :me', { me: user.userId });
          if (classIds.length > 0) qb.orWhere('n.classId IN (:...classIds)', { classIds });
        }),
      );
    }
    if (query.classId !== undefined) builder.andWhere('n.classId = :classId', { classId: query.classId });
    const [rows, total] = await builder
      .orderBy('n.publishedAt', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items: await this.toViews(rows), total, page: query.page, pageSize: query.pageSize };
  }

  async update(user: AuthUser, id: number, dto: UpdateNewsDto): Promise<NewsView> {
    const post = await this.requireEditable(user, id);
    await this.posts.update(
      { id },
      {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
        updatedAt: this.clock.now().toISOString(),
      },
    );
    await this.audit.log(user.userId, 'news.update', 'news_post', post.id);
    return (await this.toViews([await this.posts.findOneByOrFail({ id })]))[0];
  }

  async remove(user: AuthUser, id: number): Promise<void> {
    await this.requireEditable(user, id);
    await this.posts.delete({ id });
    await this.audit.log(user.userId, 'news.delete', 'news_post', id);
  }

  /** The author and the Administration can edit or remove (A01). */
  private async requireEditable(user: AuthUser, id: number): Promise<NewsPost> {
    const post = await this.posts.findOneBy({ id });
    if (!post) throw new NotFoundException('Notícia não encontrada');
    if (post.authorId !== user.userId && !hasAnyRole(user.roles, ['secretary'])) {
      throw new ForbiddenException('Somente o autor ou a Administração pode alterar esta notícia.');
    }
    return post;
  }

  private async visibleClassIds(user: AuthUser): Promise<number[]> {
    const ids = new Set<number>();
    if (hasAnyRole(user.roles, ['student'])) {
      const mine = await this.enrollments.findBy({
        studentId: user.userId,
        status: In([...ACTIVE_ENROLLMENT_STATUSES]),
      });
      mine.forEach((row) => ids.add(row.classId));
    }
    if (hasAnyRole(user.roles, ['teacher'])) {
      const taught = await this.classes.findBy({ teacherId: user.userId });
      taught.forEach((row) => ids.add(row.id));
    }
    return [...ids];
  }

  private async toViews(rows: NewsPost[]): Promise<NewsView[]> {
    const authors = rows.length
      ? await this.users.findBy({ id: In([...new Set(rows.map((row) => row.authorId))]) })
      : [];
    const names = new Map(authors.map((author) => [author.id, author.name]));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      classId: row.classId,
      authorId: row.authorId,
      authorName: names.get(row.authorId) ?? '',
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
    }));
  }
}
