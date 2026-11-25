import { Injectable } from '@nestjs/common';
import { ClassesService } from '../classes/classes.service';
import { ResultsService } from '../grades/results.service';
import { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from '../audit/audit.service';
import { hasAnyRole } from '../../common/domain/roles';
import { toCsv } from '../../common/utils/csv.util';
import { buildPdf, PdfLine } from '../../common/utils/pdf.util';

export type ReportKind = 'grades' | 'attendance';
export type ReportFormat = 'csv' | 'pdf';

const RESULT_LABELS: Record<string, string> = {
  approved: 'Aprovado',
  failed_grade: 'Reprovado por nota',
  failed_attendance: 'Reprovado por falta',
  in_progress: 'Em andamento',
};

const fmt = (value: number | null): string =>
  value === null ? '-' : value.toFixed(2).replace('.', ',');

export interface ReportFile {
  filename: string;
  contentType: string;
  body: Buffer | string;
}

/** RNF10: grade and attendance reports of a class, in CSV or PDF. */
@Injectable()
export class ReportsService {
  constructor(
    private readonly classesService: ClassesService,
    private readonly results: ResultsService,
    private readonly audit: AuditService,
  ) {}

  async generate(
    user: AuthUser,
    classId: number,
    kind: ReportKind,
    format: ReportFormat,
  ): Promise<ReportFile> {
    const group = await this.classesService.require(classId);
    if (!hasAnyRole(user.roles, ['secretary'])) {
      this.classesService.assertResponsibleTeacher(user, group);
    }
    const summary = await this.results.summarize(classId);
    const title = `${group.subject.code} ${group.code} - ${group.subject.name} (${group.semester.year}/${group.semester.term})`;

    let header: string[];
    let rows: (string | number | null)[][];
    if (kind === 'grades') {
      header = [
        'Matrícula', 'Aluno',
        ...summary.assessments.map((a) => `${a.name} (peso ${a.weight})`),
        'Média parcial', 'Média final', 'Resultado',
      ];
      rows = summary.rows.map((row) => [
        row.registrationNumber ?? '',
        row.name,
        ...summary.assessments.map((a) => (a.id in row.grades ? row.grades[a.id] : null)),
        row.partialAverage,
        row.finalGrade,
        RESULT_LABELS[row.result],
      ]);
    } else {
      header = ['Matrícula', 'Aluno', 'Aulas registradas', 'Faltas', 'Faltas (%)'];
      rows = summary.rows.map((row) => [
        row.registrationNumber ?? '',
        row.name,
        summary.lessonDates.length,
        row.absences,
        row.absencePercent,
      ]);
    }

    await this.audit.log(user.userId, 'report.export', 'class_group', classId, { kind, format });
    const filename = `${kind === 'grades' ? 'notas' : 'frequencia'}-${group.subject.code}-${group.code}.${format}`;

    if (format === 'csv') {
      return { filename, contentType: 'text/csv; charset=utf-8', body: toCsv(header, rows) };
    }
    const lines: (string | PdfLine)[] = [
      { text: kind === 'grades' ? 'Relatório de notas' : 'Relatório de frequência', bold: true },
      title,
      `Professor: ${(await this.classesService.toViews([group]))[0].teacher?.name ?? '-'}`,
      '',
      { text: header.join(' | '), bold: true },
      ...rows.map((row) =>
        row.map((value) => (typeof value === 'number' ? fmt(value) : (value ?? '-'))).join(' | '),
      ),
    ];
    return { filename, contentType: 'application/pdf', body: buildPdf(lines) };
  }
}
