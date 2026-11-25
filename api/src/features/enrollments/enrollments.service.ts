import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { ClassGroup } from '../classes/entities/class-group.entity';
import { ClassSchedule } from '../classes/entities/class-schedule.entity';
import { ClassesService, ClassView } from '../classes/classes.service';
import { CurriculumItem } from '../courses/entities/curriculum-item.entity';
import { Semester } from '../calendar/entities/semester.entity';
import { Student } from '../students/entities/student.entity';
import { SubjectPrerequisite } from '../subjects/entities/subject-prerequisite.entity';
import { User } from '../users/entities/user.entity';
import { ListMyEnrollmentsQueryDto } from './dto/enrollment.dto';
import { AUTO_ALLOCATION_INTERVAL_MS, isAutoAllocationEnabled } from './auto-allocation';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { ClockService } from '../../common/clock/clock.service';
import { TransactionService } from '../../common/database/transaction.service';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  EnrollmentStatus,
} from '../../common/domain/domain.constants';
import { hasAnyRole } from '../../common/domain/roles';
import {
  prerequisiteNotMet,
  ruleViolation,
  scheduleConflict,
} from '../../common/errors/coded-exceptions';
import { allocateSeats } from '../../common/domain/allocation';
import { findOverlaps } from '../../common/utils/schedule.util';

export interface EnrollmentView {
  id: number;
  status: EnrollmentStatus;
  requestedAt: string;
  confirmedAt: string | null;
  finalGrade: number | null;
  class: ClassView;
}

export interface AllocationResult {
  semesterId: number;
  allocated: number;
  notAllocated: number;
  classes: {
    classId: number;
    title: string;
    requested: number;
    allocated: number;
    notAllocated: number;
  }[];
}

export interface RosterEntry {
  enrollmentId: number;
  studentId: number;
  name: string;
  registrationNumber: string | null;
  status: EnrollmentStatus;
  finalGrade: number | null;
}

const ACTIVE = [...ACTIVE_ENROLLMENT_STATUSES];

@Injectable()
export class EnrollmentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EnrollmentsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly classesService: ClassesService,
    private readonly transactions: TransactionService,
    private readonly audit: AuditService,
    private readonly clock: ClockService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.allocateDueSemesters().catch((error) =>
        this.logger.error(`automatic allocation failed: ${error instanceof Error ? error.message : error}`),
      );
    }, AUTO_ALLOCATION_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Allocates, by itself, every deployed semester whose enrollment period has
   * ended and still has pending requests (RN03). Called by a timer, when a
   * student looks at their enrollments and after the clock is moved, so the
   * results exist as soon as the period is over. Safe to call at any time:
   * with nothing due it does one cheap query.
   */
  async allocateDueSemesters(): Promise<AllocationResult[]> {
    if (!isAutoAllocationEnabled(process.env)) return [];
    const due = await this.enrollments
      .createQueryBuilder('e')
      .innerJoin('e.classGroup', 'c')
      .innerJoin('c.semester', 's')
      .innerJoin('s.calendar', 'calendar')
      .select('DISTINCT s.id', 'semesterId')
      .where(`e.status = 'requested'`)
      .andWhere(`s.status = 'active'`)
      .andWhere('calendar.enrollmentEnd < :today', { today: this.clock.today() })
      .getRawMany<{ semesterId: number }>();

    const results: AllocationResult[] = [];
    for (const { semesterId } of due) {
      results.push(await this.allocate(Number(semesterId), null));
    }
    return results;
  }

  /**
   * UC01: registers a **request** for a seat. Nothing is confirmed here: the
   * seats are decided by `allocate` once the enrollment period has ended
   * (RN03), so the order of the requests does not decide who gets in. The
   * checks that do not depend on the other students (period, curriculum,
   * prerequisites, schedule overlap) are made now to give an early answer.
   */
  async enroll(user: AuthUser, classId: number): Promise<EnrollmentView> {
    const enrollmentId = await this.transactions.run(async (manager) => {
      const student = await manager.getRepository(Student).findOneBy({ userId: user.userId });
      if (!student) throw new ForbiddenException('Somente alunos podem se inscrever em turmas.');
      if (student.status !== 'active') {
        throw ruleViolation(
          'STUDENT_NOT_ACTIVE',
          'A situação acadêmica do aluno não permite a inscrição em turmas.',
        );
      }

      const group = await manager.getRepository(ClassGroup).findOne({
        where: { id: classId },
        relations: { semester: { calendar: true }, subject: true },
      });
      if (!group) throw new NotFoundException('Turma não encontrada');

      // E04: enrollment period closed; RN01: class not approved.
      const calendar = group.semester.calendar;
      const today = this.clock.today();
      if (
        group.semester.status !== 'active' ||
        today < calendar.enrollmentStart ||
        today > calendar.enrollmentEnd
      ) {
        throw ruleViolation('ENROLLMENT_CLOSED', 'O período de inscrição está fechado.');
      }
      if (group.status !== 'approved') {
        throw ruleViolation('CLASS_NOT_OPEN', 'A turma não está aberta para inscrição.');
      }

      const enrollments = manager.getRepository(Enrollment);
      const existing = await enrollments.findOneBy({ studentId: user.userId, classId });
      if (existing && (ACTIVE.includes(existing.status) || existing.status === 'requested')) {
        throw new ConflictException(
          existing.status === 'requested'
            ? 'Você já solicitou inscrição nesta turma'
            : 'Você já está inscrito nesta turma',
        );
      }

      await this.assertInCurriculum(manager, student, group.subjectId);
      await this.assertNotAlreadyApproved(manager, user.userId, group.subjectId);
      // E01 / RN04
      await this.assertPrerequisites(manager, user.userId, group.subjectId);
      // E02 / RN05
      await this.assertNoOverlap(manager, user.userId, group);

      const now = this.clock.now().toISOString();
      let id: number;
      if (existing) {
        await enrollments.update(
          { id: existing.id },
          { status: 'requested', requestedAt: now, confirmedAt: null, finalGrade: null },
        );
        id = existing.id;
      } else {
        id = (
          await enrollments.save(
            enrollments.create({
              studentId: user.userId,
              classId,
              status: 'requested',
              requestedAt: now,
              confirmedAt: null,
            }),
          )
        ).id;
      }
      await this.audit.log(
        user.userId, 'enrollment.request', 'enrollment', id, { classId }, manager,
      );
      return id;
    });
    return this.view(enrollmentId);
  }

  /**
   * Closes the enrollment period for a semester: decides who gets the seats
   * of each class that received more requests than it has (RN03). Allowed only
   * after the period ended. Running it again does nothing, because no request
   * is left pending.
   */
  async allocate(semesterId: number, actorId: number | null): Promise<AllocationResult> {
    const result = await this.transactions.run(async (manager) => {
      const semester = await manager.getRepository(Semester).findOne({
        where: { id: semesterId },
        relations: { calendar: true },
      });
      if (!semester) throw new NotFoundException('Semestre letivo não encontrado');
      if (semester.status !== 'active') {
        throw new ConflictException('Somente um semestre implantado pode ter inscrições alocadas');
      }
      if (this.clock.today() <= semester.calendar.enrollmentEnd) {
        throw ruleViolation(
          'ENROLLMENT_STILL_OPEN',
          `O período de inscrição ainda não terminou (vai até ${semester.calendar.enrollmentEnd.split('-').reverse().join('/')}).`,
        );
      }

      const enrollments = manager.getRepository(Enrollment);
      const pending = await enrollments
        .createQueryBuilder('e')
        .innerJoinAndSelect('e.classGroup', 'c')
        .innerJoinAndSelect('c.subject', 'subject')
        .where(`e.status = 'requested'`)
        .andWhere('c.semesterId = :semesterId', { semesterId })
        .getMany();

      const byClass = new Map<number, Enrollment[]>();
      for (const row of pending) byClass.set(row.classId, [...(byClass.get(row.classId) ?? []), row]);

      const now = this.clock.now().toISOString();
      const classes: AllocationResult['classes'] = [];
      for (const [classId, requests] of byClass) {
        const group = requests[0].classGroup;
        const students = await manager
          .getRepository(Student)
          .findBy({ userId: In(requests.map((row) => row.studentId)) });
        const studentById = new Map(students.map((row) => [row.userId, row]));
        const items = await manager
          .getRepository(CurriculumItem)
          .findBy({ subjectId: group.subjectId, courseId: In([...new Set(students.map((row) => row.courseId))]) });

        const ranked = requests.map((row) => {
          const student = studentById.get(row.studentId) as Student;
          const item = items.find((candidate) => candidate.courseId === student.courseId);
          return {
            enrollmentId: row.id,
            mandatory: item?.mandatory ?? false,
            entryYear: student.entryYear,
            requestedAt: row.requestedAt,
          };
        });
        const free = group.seats - (await this.classesService.countActive(manager, classId));
        const { allocated, notAllocated } = allocateSeats(ranked, free);

        if (allocated.length > 0) {
          await enrollments.update(
            { id: In(allocated.map((row) => row.enrollmentId)) },
            { status: 'confirmed', confirmedAt: now },
          );
        }
        if (notAllocated.length > 0) {
          await enrollments.update(
            { id: In(notAllocated.map((row) => row.enrollmentId)) },
            { status: 'not_allocated' },
          );
        }
        classes.push({
          classId,
          title: `${group.subject.code} ${group.code} - ${group.subject.name}`,
          requested: requests.length,
          allocated: allocated.length,
          notAllocated: notAllocated.length,
        });
      }

      const summary = {
        semesterId,
        classes,
        allocated: classes.reduce((sum, row) => sum + row.allocated, 0),
        notAllocated: classes.reduce((sum, row) => sum + row.notAllocated, 0),
      };
      await this.audit.log(actorId, 'enrollment.allocate', 'semester', semesterId, {
        allocated: summary.allocated,
        notAllocated: summary.notAllocated,
        ...(actorId === null ? { automatic: true } : {}),
      }, manager);
      return summary;
    });
    return result;
  }

  /** RN06: cancel (and lock) only until the calendar's withdrawal deadline. */
  async withdraw(
    user: AuthUser,
    enrollmentId: number,
    kind: 'cancelled' | 'locked',
  ): Promise<EnrollmentView> {
    await this.transactions.run(async (manager) => {
      const enrollment = await manager.getRepository(Enrollment).findOne({
        where: { id: enrollmentId, studentId: user.userId },
        relations: { classGroup: { semester: { calendar: true } } },
      });
      if (!enrollment) throw new NotFoundException('Inscrição não encontrada');
      if (enrollment.status === 'requested') {
        // Not allocated yet: the request can be withdrawn at any time, but it cannot be locked.
        if (kind === 'locked') {
          throw new ConflictException('Somente uma inscrição confirmada pode ser trancada');
        }
        await manager.getRepository(Enrollment).update({ id: enrollmentId }, { status: 'cancelled' });
        await this.audit.log(
          user.userId, 'enrollment.cancel', 'enrollment', enrollmentId, {}, manager,
        );
        return;
      }
      if (enrollment.status !== 'confirmed') {
        throw new ConflictException('Esta inscrição não pode mais ser alterada');
      }
      const deadline = enrollment.classGroup.semester.calendar.withdrawalDeadline;
      if (this.clock.today() > deadline) {
        throw ruleViolation(
          'WITHDRAWAL_DEADLINE_PASSED',
          'O prazo para cancelamento ou trancamento definido no calendário acadêmico terminou.',
        );
      }
      await manager.getRepository(Enrollment).update({ id: enrollmentId }, { status: kind });
      await this.audit.log(
        user.userId, `enrollment.${kind === 'cancelled' ? 'cancel' : 'lock'}`,
        'enrollment', enrollmentId, {}, manager,
      );
    });
    return this.view(enrollmentId);
  }

  async listMine(user: AuthUser, query: ListMyEnrollmentsQueryDto): Promise<EnrollmentView[]> {
    // If the period has just ended, the results must already be there.
    await this.allocateDueSemesters();
    const builder = this.enrollments
      .createQueryBuilder('e')
      .innerJoin('e.classGroup', 'c')
      .where('e.studentId = :me', { me: user.userId });
    if (query.semesterId !== undefined) builder.andWhere('c.semesterId = :s', { s: query.semesterId });
    if (query.status) builder.andWhere('e.status = :status', { status: query.status });
    const rows = await builder.orderBy('e.id', 'DESC').getMany();
    return this.toViews(rows);
  }

  /** The roll of a class: the responsible teacher or the Administration. */
  async roster(user: AuthUser, classId: number): Promise<RosterEntry[]> {
    const group = await this.classesService.require(classId);
    if (!hasAnyRole(user.roles, ['secretary'])) {
      this.classesService.assertResponsibleTeacher(user, group);
    }
    const rows = await this.enrollments.find({
      where: { classId, status: In(ACTIVE) },
      order: { id: 'ASC' },
    });
    const users = rows.length
      ? await this.users.findBy({ id: In(rows.map((row) => row.studentId)) })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows
      .map((row) => ({
        enrollmentId: row.id,
        studentId: row.studentId,
        name: byId.get(row.studentId)?.name ?? '',
        registrationNumber: byId.get(row.studentId)?.registrationNumber ?? null,
        status: row.status,
        finalGrade: row.finalGrade,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async view(id: number): Promise<EnrollmentView> {
    const row = await this.enrollments.findOneByOrFail({ id });
    return (await this.toViews([row]))[0];
  }

  private async toViews(rows: Enrollment[]): Promise<EnrollmentView[]> {
    if (rows.length === 0) return [];
    const groups = await this.enrollments.manager.getRepository(ClassGroup).find({
      where: { id: In(rows.map((row) => row.classId)) },
      relations: { semester: true, subject: true },
    });
    const views = new Map((await this.classesService.toViews(groups)).map((v) => [v.id, v]));
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      requestedAt: row.requestedAt,
      confirmedAt: row.confirmedAt,
      finalGrade: row.finalGrade,
      class: views.get(row.classId) as ClassView,
    }));
  }

  private async assertInCurriculum(
    manager: EntityManager,
    student: Student,
    subjectId: number,
  ): Promise<void> {
    const inMatrix = await manager
      .getRepository(CurriculumItem)
      .existsBy({ courseId: student.courseId, subjectId });
    if (!inMatrix) {
      throw ruleViolation(
        'SUBJECT_NOT_IN_CURRICULUM',
        'Esta disciplina não faz parte da matriz curricular do seu curso.',
      );
    }
  }

  private async assertNotAlreadyApproved(
    manager: EntityManager,
    studentId: number,
    subjectId: number,
  ): Promise<void> {
    const approved = await this.approvedSubjectIds(manager, studentId, [subjectId]);
    if (approved.has(subjectId)) {
      throw new ConflictException('Você já foi aprovado nesta disciplina');
    }
  }

  private async assertPrerequisites(
    manager: EntityManager,
    studentId: number,
    subjectId: number,
  ): Promise<void> {
    const links = await manager
      .getRepository(SubjectPrerequisite)
      .find({ where: { subjectId }, relations: { prerequisite: true } });
    if (links.length === 0) return;
    const approved = await this.approvedSubjectIds(
      manager, studentId, links.map((link) => link.prerequisiteId),
    );
    const missing = links.filter((link) => !approved.has(link.prerequisiteId));
    if (missing.length > 0) {
      throw prerequisiteNotMet(
        `Pendente: ${missing.map((link) => link.prerequisite.code).join(', ')}.`,
      );
    }
  }

  private async approvedSubjectIds(
    manager: EntityManager,
    studentId: number,
    subjectIds: number[],
  ): Promise<Set<number>> {
    const rows = await manager
      .getRepository(Enrollment)
      .createQueryBuilder('e')
      .innerJoin('e.classGroup', 'c')
      .select('DISTINCT c.subjectId', 'subjectId')
      .where('e.studentId = :studentId', { studentId })
      .andWhere(`e.status = 'approved'`)
      .andWhere('c.subjectId IN (:...subjectIds)', { subjectIds })
      .getRawMany<{ subjectId: number }>();
    return new Set(rows.map((row) => Number(row.subjectId)));
  }

  private async assertNoOverlap(
    manager: EntityManager,
    studentId: number,
    group: ClassGroup,
  ): Promise<void> {
    const mine = await manager
      .getRepository(Enrollment)
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.classGroup', 'c')
      .innerJoinAndSelect('c.subject', 'subject')
      .where('e.studentId = :studentId', { studentId })
      .andWhere('c.semesterId = :semesterId', { semesterId: group.semesterId })
      .andWhere('e.status IN (:...statuses)', { statuses: [...ACTIVE, 'requested'] })
      .getMany();
    if (mine.length === 0) return;

    const schedules = manager.getRepository(ClassSchedule);
    const wanted = await schedules.findBy({ classId: group.id });
    const taken = await schedules.findBy({ classId: In(mine.map((row) => row.classId)) });
    for (const [, clash] of findOverlaps(wanted, taken)) {
      const other = mine.find((row) => row.classId === clash.classId)?.classGroup;
      throw scheduleConflict(
        `Você já solicitou ou está inscrito em ${other?.subject.name ?? 'outra turma'} (${other?.code}) nesse horário.`,
      );
    }
  }
}
