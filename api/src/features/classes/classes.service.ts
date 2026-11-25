import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { ClassGroup } from './entities/class-group.entity';
import { ClassSchedule } from './entities/class-schedule.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Semester } from '../calendar/entities/semester.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import {
  CreateClassDto,
  ListClassesQueryDto,
  RejectClassDto,
  RequestClassDto,
  ScheduleDto,
  SetSchedulesDto,
  UpdateClassDto,
} from './dto/class.dto';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { ClockService } from '../../common/clock/clock.service';
import { TransactionService } from '../../common/database/transaction.service';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  ClassStatus,
  EnrollmentStatus,
} from '../../common/domain/domain.constants';
import { hasAnyRole } from '../../common/domain/roles';
import { Paginated } from '../../common/dto/pagination-query.dto';
import { scheduleConflict } from '../../common/errors/coded-exceptions';
import {
  TimeSlot,
  findOverlaps,
  toMinutes,
} from '../../common/utils/schedule.util';

export interface ClassView {
  id: number;
  code: string;
  status: ClassStatus;
  seats: number;
  enrolledCount: number;
  /** Pending requests, decided after the enrollment period ends. */
  requestedCount: number;
  availableSeats: number;
  rejectionReason: string | null;
  requestedBy: number | null;
  semester: { id: number; year: number; term: number; status: string };
  subject: { id: number; code: string; name: string; workloadHours: number };
  teacher: { id: number; name: string } | null;
  schedules: {
    weekday: number;
    startTime: string;
    endTime: string;
    room: string | null;
  }[];
  /** Present only in the student's catalogue view. */
  alreadyEnrolled?: boolean;
  /** The student's own enrollment status in this class, when there is one. */
  myStatus?: EnrollmentStatus;
}

const SLOT_ORDER = (a: TimeSlot, b: TimeSlot) =>
  a.weekday - b.weekday || toMinutes(a.startTime) - toMinutes(b.startTime);

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(ClassGroup) private readonly classes: Repository<ClassGroup>,
    @InjectRepository(ClassSchedule) private readonly schedules: Repository<ClassSchedule>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Semester) private readonly semesters: Repository<Semester>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    private readonly transactions: TransactionService,
    private readonly audit: AuditService,
    private readonly clock: ClockService,
  ) {}

  // ---- queries -----------------------------------------------------------

  async list(user: AuthUser, query: ListClassesQueryDto): Promise<Paginated<ClassView>> {
    const builder = this.classes.createQueryBuilder('c');
    const isStaff = hasAnyRole(user.roles, ['secretary']);
    if (!isStaff) {
      builder.andWhere('(c.teacherId = :me OR c.requestedBy = :me)', { me: user.userId });
    }
    this.applyFilters(builder, query);
    return this.page(builder, query);
  }

  /** Approved classes of active semesters: the catalogue (REQ09, UC02). */
  async available(user: AuthUser, query: ListClassesQueryDto): Promise<Paginated<ClassView>> {
    const builder = this.classes
      .createQueryBuilder('c')
      .innerJoin('c.semester', 's')
      .andWhere(`c.status = 'approved'`)
      .andWhere(`s.status = 'active'`);
    // A student is never offered a subject they already passed.
    if (hasAnyRole(user.roles, ['student'])) {
      builder.andWhere(
        `c.subjectId NOT IN (
          SELECT passed.subject_id FROM enrollments e
          INNER JOIN class_groups passed ON passed.id = e.class_id
          WHERE e.student_id = :me AND e.status = 'approved')`,
        { me: user.userId },
      );
    }
    this.applyFilters(builder, { ...query, status: undefined });
    const result = await this.page(builder, query);

    if (hasAnyRole(user.roles, ['student']) && result.items.length > 0) {
      const mine = await this.enrollments.find({
        where: {
          studentId: user.userId,
          classId: In(result.items.map((item) => item.id)),
          status: In([...ACTIVE_ENROLLMENT_STATUSES, 'requested']),
        },
      });
      const byClass = new Map(mine.map((row) => [row.classId, row.status]));
      for (const item of result.items) {
        item.alreadyEnrolled = byClass.has(item.id);
        item.myStatus = byClass.get(item.id);
      }
    }
    return result;
  }

  async get(id: number, user: AuthUser): Promise<ClassView> {
    const group = await this.require(id);
    const isStaff = hasAnyRole(user.roles, ['secretary']);
    const isOwner = group.teacherId === user.userId || group.requestedBy === user.userId;
    const isPublic = group.status === 'approved';
    if (!isStaff && !isOwner && !isPublic) {
      throw new ForbiddenException('Você não tem permissão para acessar esta turma.');
    }
    return (await this.toViews([group]))[0];
  }

  async require(id: number): Promise<ClassGroup> {
    const group = await this.classes.findOne({
      where: { id },
      relations: { semester: { calendar: true }, subject: true },
    });
    if (!group) throw new NotFoundException('Turma não encontrada');
    return group;
  }

  /** RN12 / RN09: only the teacher in charge of the class may act on it. */
  assertResponsibleTeacher(user: AuthUser, group: ClassGroup): void {
    if (group.teacherId !== user.userId || !hasAnyRole(user.roles, ['teacher'])) {
      throw new ForbiddenException('Você só pode atuar nas turmas sob sua responsabilidade.');
    }
  }

  // ---- commands ----------------------------------------------------------

  /** UC06: the Administration creates a class (starts pending, RN01). */
  async create(dto: CreateClassDto, actor: AuthUser): Promise<ClassView> {
    const id = await this.transactions.run(async (manager) => {
      const semester = await this.requireOpenSemester(manager, dto.semesterId);
      await this.requireSubject(manager, dto.subjectId);
      if (dto.teacherId !== undefined) await this.requireActiveTeacher(manager, dto.teacherId);
      const slots = this.normalizeSlots(dto.schedules ?? []);
      if (dto.teacherId !== undefined && slots.length > 0) {
        await this.assertTeacherFree(manager, dto.teacherId, semester.id, slots, null);
      }
      return this.insertClass(manager, {
        semesterId: semester.id,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId ?? null,
        seats: dto.seats,
        requestedBy: actor.userId,
        slots,
      });
    });
    await this.audit.log(actor.userId, 'class.create', 'class_group', id, { ...dto });
    return this.view(id);
  }

  /** UC09: a teacher asks for a class; it goes to the Administration as pending. */
  async request(dto: RequestClassDto, actor: AuthUser): Promise<ClassView> {
    const id = await this.transactions.run(async (manager) => {
      const semester = dto.semesterId
        ? await this.requireActiveSemester(manager, dto.semesterId)
        : await this.singleActiveSemester(manager);
      await this.requireSubject(manager, dto.subjectId);
      await this.requireActiveTeacher(manager, actor.userId);
      const slots = this.normalizeSlots(dto.schedules);
      if (slots.length === 0) {
        throw new BadRequestException('Informe ao menos um horário sugerido');
      }
      await this.assertTeacherFree(manager, actor.userId, semester.id, slots, null);
      return this.insertClass(manager, {
        semesterId: semester.id,
        subjectId: dto.subjectId,
        teacherId: actor.userId,
        seats: dto.seats,
        requestedBy: actor.userId,
        slots,
      });
    });
    await this.audit.log(actor.userId, 'class.request', 'class_group', id, { ...dto });
    return this.view(id);
  }

  /** Changes the seats (RN15) and/or the teacher in charge (REQ07). */
  async update(id: number, dto: UpdateClassDto, actor: AuthUser): Promise<ClassView> {
    await this.transactions.run(async (manager) => {
      const group = await this.requireForWrite(manager, id);
      const patch: Partial<ClassGroup> = {};

      if (dto.seats !== undefined) {
        const taken = await this.countActive(manager, id);
        if (dto.seats < taken) {
          throw new BadRequestException(
            `O número de vagas não pode ser inferior aos ${taken} alunos já inscritos`,
          );
        }
        patch.seats = dto.seats;
      }
      if (dto.teacherId !== undefined && dto.teacherId !== group.teacherId) {
        await this.requireActiveTeacher(manager, dto.teacherId);
        const slots = await manager.getRepository(ClassSchedule).findBy({ classId: id });
        await this.assertTeacherFree(manager, dto.teacherId, group.semesterId, slots, id);
        patch.teacherId = dto.teacherId;
      }
      if (Object.keys(patch).length > 0) {
        await manager.getRepository(ClassGroup).update({ id }, patch);
      }
    });
    await this.audit.log(actor.userId, 'class.update', 'class_group', id, { ...dto });
    return this.view(id);
  }

  /** REQ08: replaces the weekly schedule, refusing teacher conflicts (RN02). */
  async setSchedules(id: number, dto: SetSchedulesDto, actor: AuthUser): Promise<ClassView> {
    await this.transactions.run(async (manager) => {
      const group = await this.requireForWrite(manager, id);
      const slots = this.normalizeSlots(dto.schedules);
      if (group.teacherId !== null && slots.length > 0) {
        await this.assertTeacherFree(manager, group.teacherId, group.semesterId, slots, id);
      }
      const repository = manager.getRepository(ClassSchedule);
      await repository.delete({ classId: id });
      if (slots.length > 0) {
        await repository.insert(slots.map((slot) => ({ ...slot, classId: id })));
      }
    });
    await this.audit.log(actor.userId, 'class.schedule', 'class_group', id, { ...dto });
    return this.view(id);
  }

  /** UC08 / RN01: formal approval opens the class for enrollment. */
  async approve(id: number, actor: AuthUser): Promise<ClassView> {
    await this.transactions.run(async (manager) => {
      const group = await this.requireForWrite(manager, id);
      if (group.status === 'approved') {
        throw new ConflictException('A turma já está aprovada');
      }
      if (group.status !== 'pending') {
        throw new ConflictException('Somente turmas pendentes podem ser aprovadas');
      }
      const slots = await manager.getRepository(ClassSchedule).findBy({ classId: id });
      const missing: string[] = [];
      if (group.teacherId === null) missing.push('professor');
      if (slots.length === 0) missing.push('horário');
      if (missing.length > 0) {
        throw new BadRequestException(
          `Dados incompletos da turma: defina ${missing.join(' e ')} antes de aprovar`,
        );
      }
      await this.requireActiveTeacher(manager, group.teacherId as number);
      await this.assertTeacherFree(manager, group.teacherId as number, group.semesterId, slots, id);
      await manager.getRepository(ClassGroup).update(
        { id },
        {
          status: 'approved',
          approvedBy: actor.userId,
          approvedAt: this.clock.now().toISOString(),
          rejectionReason: null,
        },
      );
    });
    await this.audit.log(actor.userId, 'class.approve', 'class_group', id);
    return this.view(id);
  }

  async reject(id: number, dto: RejectClassDto, actor: AuthUser): Promise<ClassView> {
    await this.transactions.run(async (manager) => {
      const group = await this.requireForWrite(manager, id);
      if (group.status !== 'pending') {
        throw new ConflictException('Somente turmas pendentes podem ser rejeitadas');
      }
      await manager
        .getRepository(ClassGroup)
        .update({ id }, { status: 'rejected', rejectionReason: dto.reason });
    });
    await this.audit.log(actor.userId, 'class.reject', 'class_group', id, { reason: dto.reason });
    return this.view(id);
  }

  // ---- internals ---------------------------------------------------------

  /** Pending/approved classes of a teacher in a semester that would clash. */
  async assertTeacherFree(
    manager: EntityManager,
    teacherId: number,
    semesterId: number,
    slots: readonly TimeSlot[],
    excludeClassId: number | null,
  ): Promise<void> {
    if (slots.length === 0) return;
    const others = await manager
      .getRepository(ClassGroup)
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.subject', 'subject')
      .where('c.teacherId = :teacherId', { teacherId })
      .andWhere('c.semesterId = :semesterId', { semesterId })
      .andWhere(`c.status IN ('pending', 'approved')`)
      .andWhere(excludeClassId === null ? '1 = 1' : 'c.id <> :excludeClassId', { excludeClassId })
      .getMany();
    if (others.length === 0) return;

    const otherSlots = await manager
      .getRepository(ClassSchedule)
      .findBy({ classId: In(others.map((other) => other.id)) });
    for (const [mine, theirs] of findOverlaps(slots, otherSlots)) {
      const other = others.find((candidate) => candidate.id === theirs.classId);
      throw scheduleConflict(
        `O professor já ministra ${other?.subject.name ?? 'outra turma'} (${other?.code}) ` +
          `no mesmo horário (${mine.startTime}-${mine.endTime}).`,
      );
    }
  }

  async countActive(manager: EntityManager, classId: number): Promise<number> {
    return manager.getRepository(Enrollment).countBy({
      classId,
      status: In([...ACTIVE_ENROLLMENT_STATUSES]),
    });
  }

  private normalizeSlots(slots: readonly ScheduleDto[]) {
    const normalized = slots.map((slot) => ({
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room?.trim() || null,
    }));
    for (const slot of normalized) {
      if (toMinutes(slot.startTime) >= toMinutes(slot.endTime)) {
        throw new BadRequestException('O horário de início deve ser anterior ao de término');
      }
    }
    if (findOverlaps(normalized, normalized).some(([a, b]) => a !== b)) {
      throw new BadRequestException('Os horários da turma não podem se sobrepor entre si');
    }
    return normalized.sort(SLOT_ORDER);
  }

  private async insertClass(
    manager: EntityManager,
    data: {
      semesterId: number;
      subjectId: number;
      teacherId: number | null;
      seats: number;
      requestedBy: number;
      slots: ReturnType<ClassesService['normalizeSlots']>;
    },
  ): Promise<number> {
    const repository = manager.getRepository(ClassGroup);
    const existing = await repository.findBy({
      semesterId: data.semesterId,
      subjectId: data.subjectId,
    });
    const next =
      existing.reduce((max, row) => {
        const match = /^T(\d+)$/.exec(row.code);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0) + 1;
    const saved = await repository.save(
      repository.create({
        semesterId: data.semesterId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        code: `T${String(next).padStart(2, '0')}`,
        seats: data.seats,
        status: 'pending',
        requestedBy: data.requestedBy,
      }),
    );
    if (data.slots.length > 0) {
      await manager
        .getRepository(ClassSchedule)
        .insert(data.slots.map((slot) => ({ ...slot, classId: saved.id })));
    }
    return saved.id;
  }

  private async requireForWrite(manager: EntityManager, id: number): Promise<ClassGroup> {
    const group = await manager.getRepository(ClassGroup).findOneBy({ id });
    if (!group) throw new NotFoundException('Turma não encontrada');
    if (group.status === 'closed' || group.status === 'rejected') {
      throw new ConflictException('Esta turma não pode mais ser alterada');
    }
    return group;
  }

  private async requireOpenSemester(manager: EntityManager, id: number): Promise<Semester> {
    const semester = await manager.getRepository(Semester).findOneBy({ id });
    if (!semester) throw new BadRequestException('Semestre letivo não encontrado');
    if (semester.status === 'closed') {
      throw new BadRequestException('O semestre letivo está encerrado');
    }
    return semester;
  }

  private async requireActiveSemester(manager: EntityManager, id: number): Promise<Semester> {
    const semester = await this.requireOpenSemester(manager, id);
    if (semester.status !== 'active') {
      throw new BadRequestException('O semestre letivo ainda não foi implantado');
    }
    return semester;
  }

  private async singleActiveSemester(manager: EntityManager): Promise<Semester> {
    const active = await manager.getRepository(Semester).findBy({ status: 'active' });
    if (active.length === 0) {
      throw new BadRequestException('Não há semestre letivo ativo');
    }
    if (active.length > 1) {
      throw new BadRequestException('Há mais de um semestre ativo: informe o semestre');
    }
    return active[0];
  }

  private async requireSubject(manager: EntityManager, id: number): Promise<void> {
    if (!(await manager.getRepository(Subject).existsBy({ id }))) {
      throw new BadRequestException('Disciplina não encontrada');
    }
  }

  private async requireActiveTeacher(manager: EntityManager, id: number): Promise<void> {
    const teacher = await manager.getRepository(Teacher).findOneBy({ userId: id });
    if (!teacher || teacher.status !== 'active') {
      throw new BadRequestException('Professor não encontrado ou inativo');
    }
  }

  private applyFilters(
    builder: ReturnType<Repository<ClassGroup>['createQueryBuilder']>,
    query: ListClassesQueryDto,
  ): void {
    if (query.semesterId !== undefined) {
      builder.andWhere('c.semesterId = :semesterId', { semesterId: query.semesterId });
    }
    if (query.subjectId !== undefined) {
      builder.andWhere('c.subjectId = :subjectId', { subjectId: query.subjectId });
    }
    if (query.teacherId !== undefined) {
      builder.andWhere('c.teacherId = :teacherId', { teacherId: query.teacherId });
    }
    if (query.status) {
      builder.andWhere('c.status = :status', { status: query.status });
    }
    const term = query.q?.trim();
    if (term) {
      const like = `%${term.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
      builder.andWhere(
        `c.subjectId IN (SELECT id FROM subjects WHERE name LIKE :like ESCAPE '\\' OR code LIKE :like ESCAPE '\\')`,
        { like },
      );
    }
  }

  private async page(
    builder: ReturnType<Repository<ClassGroup>['createQueryBuilder']>,
    query: ListClassesQueryDto,
  ): Promise<Paginated<ClassView>> {
    const [rows, total] = await builder
      .orderBy('c.semesterId', 'DESC')
      .addOrderBy('c.subjectId', 'ASC')
      .addOrderBy('c.code', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    const groups = rows.length
      ? await this.classes.find({
          where: { id: In(rows.map((row) => row.id)) },
          relations: { semester: true, subject: true },
        })
      : [];
    const byId = new Map(groups.map((group) => [group.id, group]));
    const ordered = rows.map((row) => byId.get(row.id) as ClassGroup);
    return {
      items: await this.toViews(ordered),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private async view(id: number): Promise<ClassView> {
    return (await this.toViews([await this.require(id)]))[0];
  }

  /** Builds the API shape for many classes with a fixed number of queries. */
  async toViews(groups: ClassGroup[]): Promise<ClassView[]> {
    if (groups.length === 0) return [];
    const ids = groups.map((group) => group.id);
    const teacherIds = [
      ...new Set(groups.map((g) => g.teacherId).filter((v): v is number => v !== null)),
    ];

    const [slots, teachers, counts, requests] = await Promise.all([
      this.schedules.findBy({ classId: In(ids) }),
      teacherIds.length
        ? this.teachers.find({ where: { userId: In(teacherIds) }, relations: { user: true } })
        : Promise.resolve([] as Teacher[]),
      this.enrollments
        .createQueryBuilder('e')
        .select('e.classId', 'classId')
        .addSelect('COUNT(*)', 'total')
        .where('e.classId IN (:...ids)', { ids })
        .andWhere('e.status IN (:...statuses)', { statuses: [...ACTIVE_ENROLLMENT_STATUSES] })
        .groupBy('e.classId')
        .getRawMany<{ classId: number; total: string | number }>(),
      this.enrollments
        .createQueryBuilder('e')
        .select('e.classId', 'classId')
        .addSelect('COUNT(*)', 'total')
        .where('e.classId IN (:...ids)', { ids })
        .andWhere(`e.status = 'requested'`)
        .groupBy('e.classId')
        .getRawMany<{ classId: number; total: string | number }>(),
    ]);
    const requestsById = new Map(requests.map((row) => [Number(row.classId), Number(row.total)]));
    const countById = new Map(counts.map((row) => [Number(row.classId), Number(row.total)]));
    const teacherById = new Map(teachers.map((teacher) => [teacher.userId, teacher]));

    return groups.map((group) => {
      const enrolledCount = countById.get(group.id) ?? 0;
      const teacher = group.teacherId ? teacherById.get(group.teacherId) : undefined;
      return {
        id: group.id,
        code: group.code,
        status: group.status,
        seats: group.seats,
        enrolledCount,
        requestedCount: requestsById.get(group.id) ?? 0,
        availableSeats: Math.max(group.seats - enrolledCount, 0),
        rejectionReason: group.rejectionReason,
        requestedBy: group.requestedBy,
        semester: {
          id: group.semester.id,
          year: group.semester.year,
          term: group.semester.term,
          status: group.semester.status,
        },
        subject: {
          id: group.subject.id,
          code: group.subject.code,
          name: group.subject.name,
          workloadHours: group.subject.workloadHours,
        },
        teacher: teacher ? { id: teacher.userId, name: teacher.user.name } : null,
        schedules: slots
          .filter((slot) => slot.classId === group.id)
          .sort(SLOT_ORDER)
          .map((slot) => ({
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
          })),
      };
    });
  }
}
