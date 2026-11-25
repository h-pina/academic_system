import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Assessment } from './entities/assessment.entity';
import { Grade } from './entities/grade.entity';
import { GradeReopening } from './entities/grade-reopening.entity';
import { ClassSummary, ResultsService } from './results.service';
import {
  ApproveReopeningDto,
  CreateAssessmentDto,
  PostGradesDto,
  RequestReopeningDto,
} from './dto/grades.dto';
import { ClassGroup } from '../classes/entities/class-group.entity';
import { ClassesService } from '../classes/classes.service';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { ClockService } from '../../common/clock/clock.service';
import { TransactionService } from '../../common/database/transaction.service';
import { ACTIVE_ENROLLMENT_STATUSES } from '../../common/domain/domain.constants';
import { hasAnyRole } from '../../common/domain/roles';
import { forbiddenWithCode, ruleViolation } from '../../common/errors/coded-exceptions';
import { isIsoDate } from '../../common/utils/schedule.util';

const ACTIVE = [...ACTIVE_ENROLLMENT_STATUSES];

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Assessment) private readonly assessments: Repository<Assessment>,
    @InjectRepository(GradeReopening) private readonly reopenings: Repository<GradeReopening>,
    private readonly classesService: ClassesService,
    private readonly results: ResultsService,
    private readonly transactions: TransactionService,
    private readonly audit: AuditService,
    private readonly clock: ClockService,
  ) {}

  // ---- assessments -------------------------------------------------------

  async createAssessment(user: AuthUser, classId: number, dto: CreateAssessmentDto) {
    const group = await this.classesService.require(classId);
    this.classesService.assertResponsibleTeacher(user, group);
    this.assertGradable(group);
    const saved = await this.assessments.save(
      this.assessments.create({
        classId,
        name: dto.name.trim(),
        weight: dto.weight,
        maxScore: dto.maxScore ?? 10,
      }),
    );
    await this.audit.log(user.userId, 'assessment.create', 'assessment', saved.id, { classId });
    return saved;
  }

  async listAssessments(user: AuthUser, classId: number) {
    const group = await this.classesService.require(classId);
    this.assertCanRead(user, group);
    return this.assessments.find({ where: { classId }, order: { id: 'ASC' } });
  }

  async removeAssessment(user: AuthUser, assessmentId: number): Promise<void> {
    const assessment = await this.assessments.findOneBy({ id: assessmentId });
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');
    const group = await this.classesService.require(assessment.classId);
    this.classesService.assertResponsibleTeacher(user, group);
    const graded = await this.assessments.manager
      .getRepository(Grade)
      .existsBy({ assessmentId });
    if (graded) {
      throw new ConflictException('A avaliação já possui notas lançadas e não pode ser removida');
    }
    await this.assessments.delete({ id: assessmentId });
    await this.audit.log(user.userId, 'assessment.delete', 'assessment', assessmentId);
  }

  // ---- grades ------------------------------------------------------------

  /** UC10: posts or corrects grades of one assessment (REQ11, RN12, RN14). */
  async postGrades(
    user: AuthUser,
    assessmentId: number,
    dto: PostGradesDto,
  ): Promise<ClassSummary> {
    const assessment = await this.assessments.findOneBy({ id: assessmentId });
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');
    const group = await this.classesService.require(assessment.classId);
    this.classesService.assertResponsibleTeacher(user, group);
    this.assertGradable(group);
    await this.assertGradesOpen(group);

    const ids = dto.entries.map((entry) => entry.enrollmentId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Há alunos repetidos na lista de notas');
    }
    for (const entry of dto.entries) {
      if (entry.value > assessment.maxScore) {
        throw ruleViolation(
          'GRADE_OUT_OF_RANGE',
          `A nota deve estar entre 0 e ${assessment.maxScore}`,
        );
      }
    }

    await this.transactions.run(async (manager) => {
      const valid = await manager.getRepository(Enrollment).find({
        where: { id: In(ids), classId: group.id, status: In(ACTIVE) },
      });
      if (valid.length !== ids.length) {
        throw new BadRequestException('Há inscrições que não pertencem a esta turma');
      }
      const repository = manager.getRepository(Grade);
      const now = this.clock.now().toISOString();
      for (const entry of dto.entries) {
        const existing = await repository.findOneBy({
          enrollmentId: entry.enrollmentId,
          assessmentId,
        });
        if (existing) {
          await repository.update(
            { id: existing.id },
            { value: entry.value, postedBy: user.userId, postedAt: now },
          );
        } else {
          await repository.insert({
            enrollmentId: entry.enrollmentId,
            assessmentId,
            value: entry.value,
            postedBy: user.userId,
            postedAt: now,
          });
        }
      }
      // A correction on a finalized class refreshes those students' results.
      if (group.status === 'closed') {
        await this.results.persist(manager, group.id, ids);
      }
      await this.audit.log(
        user.userId, 'grades.post', 'assessment', assessmentId,
        { classId: group.id, count: ids.length }, manager,
      );
    });
    return this.results.summarize(group.id);
  }

  /** Roll with every grade, running averages and the projected result. */
  async classGrades(user: AuthUser, classId: number) {
    const group = await this.classesService.require(classId);
    this.assertCanRead(user, group);
    const summary = await this.results.summarize(classId);
    return { ...summary, gradesOpen: await this.isGradesOpen(group) };
  }

  /**
   * Closes the class: stores each student's final grade and outcome
   * (`approved`, `failed_grade`, `failed_attendance`), which later enrollments
   * use to check prerequisites (RN04).
   */
  async finalize(user: AuthUser, classId: number): Promise<ClassSummary> {
    const group = await this.classesService.require(classId);
    if (!hasAnyRole(user.roles, ['secretary'])) {
      this.classesService.assertResponsibleTeacher(user, group);
    }
    if (group.status === 'closed') throw new ConflictException('A turma já foi encerrada');
    if (group.status !== 'approved') {
      throw new ConflictException('Somente turmas aprovadas podem ser encerradas');
    }
    await this.transactions.run(async (manager) => {
      const summary = await this.results.summarize(classId, manager);
      if (summary.assessments.length === 0) {
        throw new BadRequestException('Cadastre as avaliações da turma antes de encerrá-la');
      }
      // Failing by attendance does not need a complete grade sheet; any other outcome does.
      const incomplete = summary.rows.filter((row) => row.result === 'in_progress');
      if (incomplete.length > 0) {
        throw new BadRequestException(
          `Faltam notas para: ${incomplete.map((row) => row.name).join(', ')}`,
        );
      }
      await this.results.persist(manager, classId);
      await manager.getRepository(ClassGroup).update({ id: classId }, { status: 'closed' });
      await this.audit.log(user.userId, 'class.finalize', 'class_group', classId, {}, manager);
    });
    return this.results.summarize(classId);
  }

  // ---- reopening (RN14) --------------------------------------------------

  async requestReopening(user: AuthUser, classId: number, dto: RequestReopeningDto) {
    const group = await this.classesService.require(classId);
    const isStaff = hasAnyRole(user.roles, ['secretary']);
    if (!isStaff) this.classesService.assertResponsibleTeacher(user, group);
    if (isStaff && !dto.openUntil) {
      throw new BadRequestException('Informe até quando as notas ficam liberadas');
    }
    if (dto.openUntil) this.assertFuture(dto.openUntil);

    const saved = await this.reopenings.save(
      this.reopenings.create({
        classId,
        justification: dto.justification,
        requestedBy: user.userId,
        status: isStaff ? 'approved' : 'pending',
        decidedBy: isStaff ? user.userId : null,
        openUntil: isStaff ? (dto.openUntil as string) : null,
      }),
    );
    await this.audit.log(user.userId, 'grades.reopen.request', 'grade_reopening', saved.id, { classId });
    return saved;
  }

  listReopenings(user: AuthUser, status?: string) {
    const where = status ? { status: status as GradeReopening['status'] } : {};
    if (hasAnyRole(user.roles, ['secretary'])) {
      return this.reopenings.find({ where, order: { id: 'DESC' } });
    }
    return this.reopenings.find({ where: { ...where, requestedBy: user.userId }, order: { id: 'DESC' } });
  }

  async decideReopening(
    user: AuthUser,
    id: number,
    decision: { approve: true; dto: ApproveReopeningDto } | { approve: false },
  ) {
    const reopening = await this.reopenings.findOneBy({ id });
    if (!reopening) throw new NotFoundException('Solicitação não encontrada');
    if (reopening.status !== 'pending') {
      throw new ConflictException('Esta solicitação já foi analisada');
    }
    if (decision.approve) this.assertFuture(decision.dto.openUntil);
    await this.reopenings.update(
      { id },
      {
        status: decision.approve ? 'approved' : 'rejected',
        decidedBy: user.userId,
        openUntil: decision.approve ? decision.dto.openUntil : null,
      },
    );
    await this.audit.log(
      user.userId, decision.approve ? 'grades.reopen.approve' : 'grades.reopen.reject',
      'grade_reopening', id,
    );
    return this.reopenings.findOneByOrFail({ id });
  }

  // ---- rules -------------------------------------------------------------

  private assertFuture(date: string): void {
    if (!isIsoDate(date) || date < this.clock.today()) {
      throw new BadRequestException('A data de liberação deve ser hoje ou uma data futura');
    }
  }

  private assertGradable(group: ClassGroup): void {
    if (group.status !== 'approved' && group.status !== 'closed') {
      throw new BadRequestException('A turma ainda não foi aprovada');
    }
  }

  private assertCanRead(user: AuthUser, group: ClassGroup): void {
    if (hasAnyRole(user.roles, ['secretary'])) return;
    this.classesService.assertResponsibleTeacher(user, group);
  }

  /** RN14: within the calendar deadline, or inside an approved reopening. */
  async isGradesOpen(group: ClassGroup): Promise<boolean> {
    const today = this.clock.today();
    if (today <= group.semester.calendar.gradesDeadline) return true;
    const open = await this.reopenings.find({
      where: { classId: group.id, status: 'approved' },
    });
    return open.some((row) => row.openUntil !== null && row.openUntil >= today);
  }

  private async assertGradesOpen(group: ClassGroup): Promise<void> {
    if (!(await this.isGradesOpen(group))) {
      throw forbiddenWithCode(
        'GRADES_DEADLINE_PASSED',
        'O prazo de lançamento de notas terminou. Solicite a liberação à Administração.',
      );
    }
  }
}
