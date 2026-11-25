import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { RecordAttendanceDto } from './dto/attendance.dto';
import { ClassesService } from '../classes/classes.service';
import { ClassSchedule } from '../classes/entities/class-schedule.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { ResultsService } from '../grades/results.service';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { ClockService } from '../../common/clock/clock.service';
import { TransactionService } from '../../common/database/transaction.service';
import { ACTIVE_ENROLLMENT_STATUSES } from '../../common/domain/domain.constants';
import { hasAnyRole } from '../../common/domain/roles';
import { ruleViolation } from '../../common/errors/coded-exceptions';
import { isIsoDate, isoWeekday } from '../../common/utils/schedule.util';

const ACTIVE = [...ACTIVE_ENROLLMENT_STATUSES];

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>,
    @InjectRepository(ClassSchedule) private readonly schedules: Repository<ClassSchedule>,
    private readonly classesService: ClassesService,
    private readonly results: ResultsService,
    private readonly transactions: TransactionService,
    private readonly audit: AuditService,
    private readonly clock: ClockService,
  ) {}

  /**
   * UC11. Only the teacher in charge (RN09), never for a future date (RN13),
   * and only on a day the class actually meets.
   */
  async record(user: AuthUser, classId: number, dto: RecordAttendanceDto) {
    const group = await this.classesService.require(classId);
    this.classesService.assertResponsibleTeacher(user, group);
    if (group.status !== 'approved' && group.status !== 'closed') {
      throw new BadRequestException('A turma ainda não foi aprovada');
    }
    if (!isIsoDate(dto.date)) throw new BadRequestException('Data inválida');
    if (dto.date > this.clock.today()) {
      throw ruleViolation(
        'FUTURE_DATE',
        'Não é permitido registrar frequência para datas futuras.',
      );
    }
    const { startDate, endDate } = group.semester;
    if (dto.date < startDate || dto.date > endDate) {
      throw ruleViolation('NOT_A_CLASS_DAY', 'A data está fora do período do semestre letivo.');
    }
    const weekdays = (await this.schedules.findBy({ classId })).map((slot) => slot.weekday);
    if (!weekdays.includes(isoWeekday(dto.date))) {
      throw ruleViolation(
        'NOT_A_CLASS_DAY',
        'A turma não tem aula na data informada.',
      );
    }

    const ids = dto.records.map((entry) => entry.enrollmentId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Há alunos repetidos na chamada');
    }

    await this.transactions.run(async (manager) => {
      const valid = await manager
        .getRepository(Enrollment)
        .find({ where: { id: In(ids), classId, status: In(ACTIVE) } });
      if (valid.length !== ids.length) {
        throw new BadRequestException('Há inscrições que não pertencem a esta turma');
      }
      const repository = manager.getRepository(AttendanceRecord);
      for (const entry of dto.records) {
        const existing = await repository.findOneBy({
          enrollmentId: entry.enrollmentId,
          lessonDate: dto.date,
        });
        if (existing) {
          await repository.update(
            { id: existing.id },
            { present: entry.present, recordedBy: user.userId },
          );
        } else {
          await repository.insert({
            classId,
            enrollmentId: entry.enrollmentId,
            lessonDate: dto.date,
            present: entry.present,
            recordedBy: user.userId,
          });
        }
      }
      if (group.status === 'closed') await this.results.persist(manager, classId, ids);
      await this.audit.log(
        user.userId, 'attendance.record', 'class_group', classId,
        { date: dto.date, count: ids.length }, manager,
      );
    });
    return this.roll(user, classId, dto.date);
  }

  /** The roll call of one date, or the per-student summary without a date. */
  async roll(user: AuthUser, classId: number, date?: string) {
    const group = await this.classesService.require(classId);
    if (!hasAnyRole(user.roles, ['secretary'])) {
      this.classesService.assertResponsibleTeacher(user, group);
    }
    const summary = await this.results.summarize(classId);
    const onDate = date
      ? await this.records.findBy({ classId, lessonDate: date })
      : [];
    const presence = new Map(onDate.map((record) => [record.enrollmentId, record.present]));
    return {
      classId,
      date: date ?? null,
      lessonDates: summary.lessonDates,
      students: summary.rows.map((row) => ({
        enrollmentId: row.enrollmentId,
        studentId: row.studentId,
        name: row.name,
        registrationNumber: row.registrationNumber,
        absences: row.absences,
        absencePercent: row.absencePercent,
        present: date ? (presence.get(row.enrollmentId) ?? null) : null,
      })),
    };
  }
}
