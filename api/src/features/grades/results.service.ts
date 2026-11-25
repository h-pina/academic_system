import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Assessment } from './entities/assessment.entity';
import { Grade } from './entities/grade.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { User } from '../users/entities/user.entity';
import { SettingsService } from '../settings/settings.service';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  EnrollmentStatus,
} from '../../common/domain/domain.constants';
import {
  ProjectedResult,
  absencePercent,
  resolveResult,
  weightedAverage,
} from '../../common/domain/results';

export interface StudentSummary {
  enrollmentId: number;
  studentId: number;
  name: string;
  registrationNumber: string | null;
  enrollmentStatus: EnrollmentStatus;
  /** Grade value per assessment id (own scale); missing means not posted. */
  grades: Record<number, number>;
  partialAverage: number | null;
  finalGrade: number | null;
  absences: number;
  absencePercent: number;
  result: ProjectedResult;
}

export interface ClassSummary {
  classId: number;
  assessments: { id: number; name: string; weight: number; maxScore: number }[];
  /** Dates on which a roll call was recorded. */
  lessonDates: string[];
  minPassingGrade: number;
  rows: StudentSummary[];
}

const ACTIVE = [...ACTIVE_ENROLLMENT_STATUSES];

/** Combines grades and attendance into the result of each student (RN07, RN08). */
@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Assessment) private readonly assessments: Repository<Assessment>,
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly settings: SettingsService,
  ) {}

  async summarize(classId: number, manager?: EntityManager): Promise<ClassSummary> {
    const repo = <T extends object>(entity: new () => T) =>
      manager ? manager.getRepository(entity) : (this.repositoryFor(entity) as Repository<T>);

    const [assessments, enrollments, settings] = await Promise.all([
      repo(Assessment).find({ where: { classId }, order: { id: 'ASC' } }),
      repo(Enrollment).find({ where: { classId, status: In(ACTIVE) }, order: { id: 'ASC' } }),
      this.settings.get(),
    ]);
    const enrollmentIds = enrollments.map((row) => row.id);
    const [grades, records, users] = enrollmentIds.length
      ? await Promise.all([
          repo(Grade).find({ where: { enrollmentId: In(enrollmentIds) } }),
          repo(AttendanceRecord).find({ where: { classId } }),
          repo(User).findBy({ id: In(enrollments.map((row) => row.studentId)) }),
        ])
      : [[], [], []];

    const userById = new Map(users.map((user) => [user.id, user]));
    const lessonDates = [...new Set(records.map((record) => record.lessonDate))].sort();

    const rows = enrollments.map((enrollment) => {
      const own = new Map(
        grades.filter((g) => g.enrollmentId === enrollment.id).map((g) => [g.assessmentId, g.value]),
      );
      const average = weightedAverage(assessments, own);
      const absences = records.filter(
        (record) => record.enrollmentId === enrollment.id && !record.present,
      ).length;
      const percent = absencePercent(absences, lessonDates.length);
      const user = userById.get(enrollment.studentId);
      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        name: user?.name ?? '',
        registrationNumber: user?.registrationNumber ?? null,
        enrollmentStatus: enrollment.status,
        grades: Object.fromEntries(own),
        partialAverage: average.partial,
        finalGrade: average.final,
        absences,
        absencePercent: percent,
        result: resolveResult({
          finalGrade: average.final,
          absencePercent: percent,
          minPassingGrade: settings.minPassingGrade,
        }),
      } satisfies StudentSummary;
    });
    rows.sort((a, b) => a.name.localeCompare(b.name));

    return {
      classId,
      assessments: assessments.map(({ id, name, weight, maxScore }) => ({ id, name, weight, maxScore })),
      lessonDates,
      minPassingGrade: settings.minPassingGrade,
      rows,
    };
  }

  /**
   * Stores the outcome on the enrollments (used when a class is finalized and
   * when a closed class is corrected). Students still `in_progress` keep their
   * status.
   */
  async persist(
    manager: EntityManager,
    classId: number,
    onlyEnrollmentIds?: number[],
  ): Promise<void> {
    const summary = await this.summarize(classId, manager);
    for (const row of summary.rows) {
      if (onlyEnrollmentIds && !onlyEnrollmentIds.includes(row.enrollmentId)) continue;
      if (row.result === 'in_progress') continue;
      await manager.getRepository(Enrollment).update(
        { id: row.enrollmentId },
        { status: row.result, finalGrade: row.finalGrade },
      );
    }
  }

  private repositoryFor(entity: unknown): Repository<object> {
    const map = new Map<unknown, Repository<object>>([
      [Assessment, this.assessments],
      [Grade, this.grades],
      [AttendanceRecord, this.attendance],
      [Enrollment, this.enrollments],
      [User, this.users],
    ]);
    return map.get(entity) as Repository<object>;
  }
}
