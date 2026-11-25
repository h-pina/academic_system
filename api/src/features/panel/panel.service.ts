import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { Submission } from '../activities/entities/submission.entity';
import { ClassGroup } from '../classes/entities/class-group.entity';
import { ClassesService, ClassView } from '../classes/classes.service';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { ResultsService } from '../grades/results.service';
import { NewsPost } from '../news/entities/news-post.entity';
import { AuthUser } from '../auth/auth-user.interface';
import { SettingsService } from '../settings/settings.service';
import { ClockService } from '../../common/clock/clock.service';
import { ACTIVE_ENROLLMENT_STATUSES } from '../../common/domain/domain.constants';
import { ProjectedResult } from '../../common/domain/results';

export interface PanelClass {
  enrollmentId: number;
  enrollmentStatus: string;
  class: ClassView;
  grades: {
    assessmentId: number;
    name: string;
    weight: number;
    maxScore: number;
    value: number | null;
  }[];
  partialAverage: number | null;
  finalGrade: number | null;
  attendance: { lessons: number; absences: number; absencePercent: number };
  result: ProjectedResult;
  activities: {
    id: number;
    title: string;
    dueAt: string;
    state: 'pending' | 'submitted' | 'late' | 'overdue';
    submittedAt: string | null;
  }[];
  news: { id: number; title: string; body: string; publishedAt: string }[];
}

export interface AcademicPanel {
  minPassingGrade: number;
  classes: PanelClass[];
}

const NEWS_PER_CLASS = 5;

/**
 * UC03 / REQ15: one response with grades, attendance, activities and news
 * for every class the student is enrolled in, and nothing else (RN13).
 */
@Injectable()
export class PanelService {
  constructor(
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(ClassGroup) private readonly classes: Repository<ClassGroup>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(Submission) private readonly submissions: Repository<Submission>,
    @InjectRepository(NewsPost) private readonly news: Repository<NewsPost>,
    private readonly classesService: ClassesService,
    private readonly results: ResultsService,
    private readonly clock: ClockService,
    private readonly settingsService: SettingsService,
  ) {}

  async forStudent(user: AuthUser): Promise<AcademicPanel> {
    const mine = await this.enrollments.find({
      where: { studentId: user.userId, status: In([...ACTIVE_ENROLLMENT_STATUSES]) },
      order: { id: 'DESC' },
    });
    let minPassingGrade = (await this.settingsService.get()).minPassingGrade;
    if (mine.length === 0) return { minPassingGrade, classes: [] };

    const classIds = mine.map((row) => row.classId);
    const [groups, activities, mySubmissions, news] = await Promise.all([
      this.classes.find({
        where: { id: In(classIds) },
        relations: { semester: true, subject: true },
      }),
      this.activities.find({ where: { classId: In(classIds) }, order: { dueAt: 'ASC' } }),
      this.submissions.findBy({ studentId: user.userId }),
      this.news
        .createQueryBuilder('n')
        .where('n.classId IN (:...classIds)', { classIds })
        .orderBy('n.publishedAt', 'DESC')
        .getMany(),
    ]);
    const views = new Map((await this.classesService.toViews(groups)).map((v) => [v.id, v]));
    const submissionByActivity = new Map(mySubmissions.map((s) => [s.activityId, s]));
    const now = this.clock.now();

    const classesOut: PanelClass[] = [];
    for (const enrollment of mine) {
      const summary = await this.results.summarize(enrollment.classId);
      minPassingGrade = summary.minPassingGrade;
      const row = summary.rows.find((r) => r.enrollmentId === enrollment.id);
      if (!row) continue;
      // Once a class is finalized the stored outcome is authoritative.
      const finalized = enrollment.finalGrade !== null && enrollment.status !== 'confirmed';
      classesOut.push({
        enrollmentId: enrollment.id,
        enrollmentStatus: enrollment.status,
        class: views.get(enrollment.classId) as ClassView,
        grades: summary.assessments.map((assessment) => ({
          assessmentId: assessment.id,
          name: assessment.name,
          weight: assessment.weight,
          maxScore: assessment.maxScore,
          value: row.grades[assessment.id] ?? null,
        })),
        partialAverage: row.partialAverage,
        finalGrade: finalized ? enrollment.finalGrade : row.finalGrade,
        attendance: {
          lessons: summary.lessonDates.length,
          absences: row.absences,
          absencePercent: row.absencePercent,
        },
        result: finalized ? (enrollment.status as ProjectedResult) : row.result,
        activities: activities
          .filter((activity) => activity.classId === enrollment.classId)
          .map((activity) => {
            const own = submissionByActivity.get(activity.id);
            return {
              id: activity.id,
              title: activity.title,
              dueAt: activity.dueAt,
              state: own
                ? own.late
                  ? ('late' as const)
                  : ('submitted' as const)
                : now > new Date(activity.dueAt)
                  ? ('overdue' as const)
                  : ('pending' as const),
              submittedAt: own?.submittedAt ?? null,
            };
          }),
        news: news
          .filter((post) => post.classId === enrollment.classId)
          .slice(0, NEWS_PER_CLASS)
          .map(({ id, title, body, publishedAt }) => ({ id, title, body, publishedAt })),
      });
    }
    return { minPassingGrade, classes: classesOut };
  }
}
