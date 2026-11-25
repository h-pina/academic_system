import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve, sep } from 'node:path';
import { Activity } from './entities/activity.entity';
import { Submission } from './entities/submission.entity';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { ClassesService } from '../classes/classes.service';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { ClassGroup } from '../classes/entities/class-group.entity';
import { User } from '../users/entities/user.entity';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { ClockService } from '../../common/clock/clock.service';
import { ACTIVE_ENROLLMENT_STATUSES } from '../../common/domain/domain.constants';
import { hasAnyRole } from '../../common/domain/roles';
import { ruleViolation } from '../../common/errors/coded-exceptions';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'text/plain': ['.txt'],
  'application/zip': ['.zip'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export type SubmissionState = 'pending' | 'submitted' | 'late' | 'overdue';

export interface ActivityView {
  id: number;
  classId: number;
  title: string;
  description: string;
  dueAt: string;
  allowLateUntil: string | null;
  /** Only for the student's own view. */
  state?: SubmissionState;
  submittedAt?: string | null;
}

@Injectable()
export class ActivitiesService {
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(Submission) private readonly submissions: Repository<Submission>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly classesService: ClassesService,
    private readonly audit: AuditService,
    private readonly clock: ClockService,
    config: ConfigService,
  ) {
    this.uploadDir = resolve(config.get<string>('UPLOAD_DIR') ?? 'data/uploads');
  }

  async create(user: AuthUser, classId: number, dto: CreateActivityDto): Promise<ActivityView> {
    const group = await this.classesService.require(classId);
    this.classesService.assertResponsibleTeacher(user, group);
    this.assertPublishable(group);
    this.assertDates(dto.dueAt, dto.allowLateUntil);
    const saved = await this.activities.save(
      this.activities.create({
        classId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        dueAt: new Date(dto.dueAt).toISOString(),
        allowLateUntil: dto.allowLateUntil ? new Date(dto.allowLateUntil).toISOString() : null,
        createdBy: user.userId,
        createdAt: this.clock.now().toISOString(),
      }),
    );
    await this.audit.log(user.userId, 'activity.create', 'activity', saved.id, { classId });
    return this.toView(saved);
  }

  async update(user: AuthUser, id: number, dto: UpdateActivityDto): Promise<ActivityView> {
    const activity = await this.require(id);
    const group = await this.classesService.require(activity.classId);
    this.classesService.assertResponsibleTeacher(user, group);
    const dueAt = dto.dueAt ?? activity.dueAt;
    const late = dto.allowLateUntil ?? activity.allowLateUntil ?? undefined;
    this.assertDates(dueAt, late, false);
    await this.activities.update(
      { id },
      {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        dueAt: new Date(dueAt).toISOString(),
        allowLateUntil: late ? new Date(late).toISOString() : null,
      },
    );
    await this.audit.log(user.userId, 'activity.update', 'activity', id);
    return this.toView(await this.require(id));
  }

  async remove(user: AuthUser, id: number): Promise<void> {
    const activity = await this.require(id);
    const group = await this.classesService.require(activity.classId);
    this.classesService.assertResponsibleTeacher(user, group);
    if (await this.submissions.existsBy({ activityId: id })) {
      throw new ConflictException('A atividade já possui envios e não pode ser removida');
    }
    await this.activities.delete({ id });
    await this.audit.log(user.userId, 'activity.delete', 'activity', id);
  }

  /** Teacher/Administration see all; a student sees those of enrolled classes (RN13). */
  async listForClass(user: AuthUser, classId: number): Promise<ActivityView[]> {
    const group = await this.classesService.require(classId);
    const rows = await this.activities.find({ where: { classId }, order: { dueAt: 'ASC' } });

    if (hasAnyRole(user.roles, ['secretary']) || group.teacherId === user.userId) {
      return rows.map((row) => this.toView(row));
    }
    await this.assertEnrolled(user.userId, classId);
    const mine = rows.length
      ? await this.submissions.find({
          where: { studentId: user.userId, activityId: In(rows.map((row) => row.id)) },
        })
      : [];
    const byActivity = new Map(mine.map((s) => [s.activityId, s]));
    return rows.map((row) => this.toView(row, byActivity.get(row.id) ?? null, true));
  }

  /** UC12: the student's delivery, accepted until the deadline (RN10). */
  async submit(
    user: AuthUser,
    activityId: number,
    answerText: string | undefined,
    file: Express.Multer.File | undefined,
  ) {
    const activity = await this.require(activityId);
    const group = await this.classesService.require(activity.classId);
    if (group.status !== 'approved') {
      throw new BadRequestException('A turma não está ativa para novos envios');
    }
    await this.assertEnrolled(user.userId, activity.classId);

    const text = answerText?.trim();
    if (!text && !file) {
      throw new BadRequestException('Envie um arquivo ou escreva uma resposta');
    }
    if (file) this.assertFile(file);

    const now = this.clock.now();
    let late = false;
    if (now > new Date(activity.dueAt)) {
      const limit = activity.allowLateUntil ? new Date(activity.allowLateUntil) : null;
      if (!limit || now > limit) {
        throw ruleViolation(
          'DEADLINE_PASSED',
          'O prazo de entrega terminou e o professor não permite envios com atraso.',
        );
      }
      late = true;
    }

    const existing = await this.submissions.findOneBy({ activityId, studentId: user.userId });
    let stored: { name: string; path: string } | null = null;
    if (file) stored = await this.store(activityId, user.userId, file);

    const data = {
      answerText: text || null,
      fileName: stored?.name ?? null,
      filePath: stored?.path ?? null,
      submittedAt: now.toISOString(),
      late,
    };
    let saved: Submission;
    if (existing) {
      await this.submissions.update({ id: existing.id }, data); // replaces the old delivery
      if (existing.filePath) await this.removeFile(existing.filePath);
      saved = await this.submissions.findOneByOrFail({ id: existing.id });
    } else {
      saved = await this.submissions.save(
        this.submissions.create({ activityId, studentId: user.userId, ...data }),
      );
    }
    await this.audit.log(user.userId, 'submission.send', 'activity', activityId, { late });
    return this.submissionView(saved);
  }

  async listSubmissions(user: AuthUser, activityId: number) {
    const activity = await this.require(activityId);
    const group = await this.classesService.require(activity.classId);
    if (!hasAnyRole(user.roles, ['secretary'])) {
      this.classesService.assertResponsibleTeacher(user, group);
    }
    const rows = await this.submissions.find({ where: { activityId }, order: { submittedAt: 'ASC' } });
    const users = rows.length
      ? await this.users.findBy({ id: In(rows.map((row) => row.studentId)) })
      : [];
    const names = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((row) => ({ ...this.submissionView(row), studentName: names.get(row.studentId) ?? '' }));
  }

  async mySubmission(user: AuthUser, activityId: number) {
    const activity = await this.require(activityId);
    await this.assertEnrolled(user.userId, activity.classId);
    const row = await this.submissions.findOneBy({ activityId, studentId: user.userId });
    if (!row) throw new NotFoundException('Você ainda não enviou esta atividade');
    return this.submissionView(row);
  }

  /** The stored file, for the owner, the responsible teacher or the Administration. */
  async fileOf(user: AuthUser, submissionId: number): Promise<{ path: string; name: string }> {
    const submission = await this.submissions.findOneBy({ id: submissionId });
    if (!submission || !submission.filePath) throw new NotFoundException('Arquivo não encontrado');
    const activity = await this.require(submission.activityId);
    const group = await this.classesService.require(activity.classId);
    const allowed =
      submission.studentId === user.userId ||
      group.teacherId === user.userId ||
      hasAnyRole(user.roles, ['secretary']);
    if (!allowed) throw new ForbiddenException('Você não tem permissão para acessar este arquivo.');
    return { path: this.absolute(submission.filePath), name: submission.fileName ?? 'arquivo' };
  }

  // ---- internals ---------------------------------------------------------

  private async require(id: number): Promise<Activity> {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    return activity;
  }

  private async assertEnrolled(studentId: number, classId: number): Promise<void> {
    const enrolled = await this.enrollments.existsBy({
      studentId,
      classId,
      status: In([...ACTIVE_ENROLLMENT_STATUSES]),
    });
    if (!enrolled) {
      throw new ForbiddenException('Você não está inscrito nesta turma.');
    }
  }

  private assertPublishable(group: ClassGroup): void {
    if (group.status !== 'approved') {
      throw new BadRequestException('A turma ainda não foi aprovada ou já foi encerrada');
    }
  }

  private assertDates(dueAt: string, allowLateUntil?: string, mustBeFuture = true): void {
    const due = new Date(dueAt);
    if (mustBeFuture && due <= this.clock.now()) {
      throw new BadRequestException('O prazo de entrega deve estar no futuro');
    }
    if (allowLateUntil && new Date(allowLateUntil) <= due) {
      throw new BadRequestException('O aceite com atraso deve terminar depois do prazo de entrega');
    }
  }

  private assertFile(file: Express.Multer.File): void {
    const extension = extname(file.originalname).toLowerCase();
    const allowed = ALLOWED_TYPES[file.mimetype];
    if (!allowed || !allowed.includes(extension)) {
      throw ruleViolation(
        'FILE_TYPE_NOT_ALLOWED',
        'Tipo de arquivo não permitido. Envie PDF, imagem, texto, ZIP ou DOCX.',
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw ruleViolation('FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo de 5 MB.');
    }
  }

  private async store(activityId: number, studentId: number, file: Express.Multer.File) {
    const directory = join(this.uploadDir, 'submissions');
    await mkdir(directory, { recursive: true });
    const stored = `${activityId}-${studentId}-${Date.now()}${extname(file.originalname).toLowerCase()}`;
    await writeFile(join(directory, stored), file.buffer);
    const name = basename(file.originalname).replace(/[^\w.\- ()]/g, '_').slice(0, 120);
    return { name, path: join('submissions', stored) };
  }

  private async removeFile(relative: string): Promise<void> {
    await rm(this.absolute(relative), { force: true });
  }

  /** Resolves a stored path and refuses anything outside the upload directory. */
  private absolute(relative: string): string {
    const full = resolve(this.uploadDir, relative);
    if (!full.startsWith(this.uploadDir + sep)) {
      throw new ForbiddenException('Caminho inválido');
    }
    return full;
  }

  private toView(row: Activity, own?: Submission | null, student = false): ActivityView {
    const view: ActivityView = {
      id: row.id,
      classId: row.classId,
      title: row.title,
      description: row.description,
      dueAt: row.dueAt,
      allowLateUntil: row.allowLateUntil,
    };
    if (student) {
      view.submittedAt = own?.submittedAt ?? null;
      view.state = own
        ? own.late
          ? 'late'
          : 'submitted'
        : this.clock.now() > new Date(row.dueAt)
          ? 'overdue'
          : 'pending';
    }
    return view;
  }

  private submissionView(row: Submission) {
    return {
      id: row.id,
      activityId: row.activityId,
      studentId: row.studentId,
      answerText: row.answerText,
      fileName: row.fileName,
      hasFile: row.filePath !== null,
      submittedAt: row.submittedAt,
      late: row.late,
    };
  }
}
