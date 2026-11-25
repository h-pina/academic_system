import { DataSource } from 'typeorm';
import { Activity } from '../features/activities/entities/activity.entity';
import { AttendanceRecord } from '../features/attendance/entities/attendance-record.entity';
import { AcademicCalendar } from '../features/calendar/entities/academic-calendar.entity';
import { Semester } from '../features/calendar/entities/semester.entity';
import { ClassGroup } from '../features/classes/entities/class-group.entity';
import { ClassSchedule } from '../features/classes/entities/class-schedule.entity';
import { Enrollment } from '../features/enrollments/entities/enrollment.entity';
import { Assessment } from '../features/grades/entities/assessment.entity';
import { Grade } from '../features/grades/entities/grade.entity';
import { NewsPost } from '../features/news/entities/news-post.entity';
import { Subject } from '../features/subjects/entities/subject.entity';
import { User } from '../features/users/entities/user.entity';

const day = 24 * 60 * 60 * 1000;
const iso = (date: Date) => date.toISOString().slice(0, 10);
const shift = (base: Date, days: number) => new Date(base.getTime() + days * day);

/** Monday on or before `date`. */
function mondayOnOrBefore(date: Date): Date {
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  return shift(date, -(weekday - 1));
}

/**
 * Demo data for the semester operations: a closed past semester (so some
 * prerequisites are already approved) and a running one with open classes, a
 * pending class awaiting approval, grades, attendance, an activity and news.
 * Dates are relative to `now` so the demo always has an open enrollment window.
 */
export async function seedAcademicDemo(dataSource: DataSource, now = new Date()): Promise<void> {
  const calendars = dataSource.getRepository(AcademicCalendar);
  if ((await calendars.count()) > 0) return;

  const userId = async (cpf: string) =>
    (await dataSource.getRepository(User).findOneByOrFail({ cpf })).id;
  const subjectId = async (code: string) =>
    (await dataSource.getRepository(Subject).findOneByOrFail({ code })).id;

  const carol = await userId('11122233396');
  const frank = await userId('12121212108');
  const grace = await userId('22233344405');
  const bob = await userId('98765432100');
  const erin = await userId('11144477735');
  const ivan = await userId('44455566619');
  const judy = await userId('55566677720');
  const heidi = await userId('33344455508');
  const nina = await userId('10020030088');

  const year = now.getUTCFullYear();
  const pastStart = shift(now, -240);
  const pastCalendar = await calendars.save(
    calendars.create({
      description: `Calendário ${year - 1}/2`,
      startDate: iso(pastStart),
      endDate: iso(shift(pastStart, 120)),
      enrollmentStart: iso(pastStart),
      enrollmentEnd: iso(shift(pastStart, 14)),
      withdrawalDeadline: iso(shift(pastStart, 60)),
      gradesDeadline: iso(shift(pastStart, 135)),
    }),
  );
  const start = mondayOnOrBefore(shift(now, -42));
  const calendar = await calendars.save(
    calendars.create({
      description: `Calendário ${year}/2`,
      startDate: iso(start),
      endDate: iso(shift(start, 140)),
      // A wide window so the demo can always enroll and cancel.
      enrollmentStart: iso(shift(now, -30)),
      enrollmentEnd: iso(shift(now, 30)),
      withdrawalDeadline: iso(shift(now, 45)),
      gradesDeadline: iso(shift(start, 154)),
    }),
  );

  const semesters = dataSource.getRepository(Semester);
  const past = await semesters.save(
    semesters.create({
      calendarId: pastCalendar.id,
      year: year - 1,
      term: 2,
      startDate: pastCalendar.startDate,
      endDate: pastCalendar.endDate,
      status: 'closed',
    }),
  );
  const current = await semesters.save(
    semesters.create({
      calendarId: calendar.id,
      year,
      term: 2,
      startDate: calendar.startDate,
      endDate: calendar.endDate,
      status: 'active',
    }),
  );

  const classes = dataSource.getRepository(ClassGroup);
  const schedules = dataSource.getRepository(ClassSchedule);
  const addClass = async (
    semesterId: number,
    subjectCode: string,
    teacherId: number,
    seats: number,
    status: ClassGroup['status'],
    slots: { weekday: number; startTime: string; endTime: string; room?: string }[],
  ) => {
    const saved = await classes.save(
      classes.create({
        semesterId,
        subjectId: await subjectId(subjectCode),
        teacherId,
        code: 'T01',
        seats,
        status,
        requestedBy: teacherId,
        approvedBy: status === 'pending' ? null : bob,
        approvedAt: status === 'pending' ? null : now.toISOString(),
      }),
    );
    await schedules.insert(slots.map((slot) => ({ ...slot, room: slot.room ?? null, classId: saved.id })));
    return saved;
  };

  const oldCc101 = await addClass(past.id, 'CC101', carol, 40, 'closed', [
    { weekday: 1, startTime: '08:00', endTime: '10:00' },
  ]);
  const cc101 = await addClass(current.id, 'CC101', carol, 30, 'approved', [
    { weekday: 1, startTime: '08:00', endTime: '10:00', room: 'Sala 101' },
    { weekday: 3, startTime: '08:00', endTime: '10:00', room: 'Sala 101' },
  ]);
  await addClass(current.id, 'CC102', carol, 30, 'approved', [
    { weekday: 2, startTime: '08:00', endTime: '10:00', room: 'Sala 102' },
  ]);
  const mat101 = await addClass(current.id, 'MAT101', frank, 40, 'approved', [
    { weekday: 2, startTime: '10:00', endTime: '12:00', room: 'Sala 201' },
  ]);
  await addClass(current.id, 'MAT103', frank, 40, 'approved', [
    { weekday: 4, startTime: '10:00', endTime: '12:00', room: 'Sala 201' },
  ]);
  // Classes for Nina's cases: one she is blocked from (MAT102 requires MAT101,
  // which she never took) and two with a single seat that someone else already
  // requested, so the allocation can go either way for her.
  await addClass(current.id, 'MAT102', frank, 40, 'approved', [
    { weekday: 3, startTime: '14:00', endTime: '16:00', room: 'Sala 202' },
  ]);
  const mat104 = await addClass(current.id, 'MAT104', frank, 1, 'approved', [
    { weekday: 2, startTime: '14:00', endTime: '16:00', room: 'Sala 203' },
  ]);
  const sta101 = await addClass(current.id, 'STA101', frank, 1, 'approved', [
    { weekday: 5, startTime: '08:00', endTime: '10:00', room: 'Sala 204' },
  ]);
  // Requested by a teacher and waiting for the Administration (UC08).
  await addClass(current.id, 'CC201', grace, 25, 'pending', [
    { weekday: 5, startTime: '14:00', endTime: '16:00' },
  ]);

  const enrollments = dataSource.getRepository(Enrollment);
  const stamp = now.toISOString();
  const enroll = async (studentId: number, classId: number, status: Enrollment['status'], finalGrade: number | null = null) =>
    enrollments.save(
      enrollments.create({ studentId, classId, status, requestedAt: stamp, confirmedAt: stamp, finalGrade }),
    );
  await enroll(ivan, oldCc101.id, 'approved', 8);
  await enroll(erin, oldCc101.id, 'failed_grade', 4.5);
  const erinCc101 = await enroll(erin, cc101.id, 'confirmed');
  // Ivan passed CC101 last year, so the current class has a different student.
  const heidiCc101 = await enroll(heidi, cc101.id, 'confirmed');
  await enroll(judy, mat101.id, 'confirmed');

  // Nina passed CC101 (so CC102 is open to her) and has not taken MAT101 (so
  // MAT102 is not). She enters in 2025, after Ivan's request but ahead of
  // Erin's 2026 entry: she loses STA101 to Ivan and wins MAT104 over Erin.
  await enroll(nina, oldCc101.id, 'approved', 7.5);
  await enroll(ivan, sta101.id, 'requested');
  await enroll(erin, mat104.id, 'requested');

  const assessments = dataSource.getRepository(Assessment);
  const exam = await assessments.save(assessments.create({ classId: cc101.id, name: 'Prova 1', weight: 3, maxScore: 10 }));
  const project = await assessments.save(assessments.create({ classId: cc101.id, name: 'Trabalho prático', weight: 2, maxScore: 10 }));
  const grades = dataSource.getRepository(Grade);
  for (const [enrollmentId, assessmentId, value] of [
    [erinCc101.id, exam.id, 8],
    [erinCc101.id, project.id, 9.5],
    [heidiCc101.id, exam.id, 6.5],
  ] as const) {
    await grades.insert({ enrollmentId, assessmentId, value, postedBy: carol, postedAt: stamp });
  }

  const attendance = dataSource.getRepository(AttendanceRecord);
  for (let week = 0; week < 4; week++) {
    const lessonDate = iso(shift(start, week * 7));
    if (lessonDate > iso(now)) break;
    for (const [enrollmentId, present] of [
      [erinCc101.id, true],
      [heidiCc101.id, week !== 1],
    ] as const) {
      await attendance.insert({ classId: cc101.id, enrollmentId, lessonDate, present, recordedBy: carol });
    }
  }

  await dataSource.getRepository(Activity).insert({
    classId: cc101.id,
    title: 'Lista de exercícios 1',
    description: 'Resolver os exercícios 1 a 10 do capítulo 2 e enviar em PDF.',
    dueAt: shift(now, 14).toISOString(),
    allowLateUntil: shift(now, 17).toISOString(),
    createdBy: carol,
    createdAt: stamp,
  });

  const news = dataSource.getRepository(NewsPost);
  await news.insert([
    { authorId: bob, classId: null, title: 'Bem-vindos ao semestre', body: 'As inscrições estão abertas. Consulte o calendário acadêmico.', publishedAt: stamp, updatedAt: stamp },
    { authorId: carol, classId: cc101.id, title: 'Primeira prova', body: 'A primeira prova será aplicada na semana que vem, na sala de aula.', publishedAt: stamp, updatedAt: stamp },
  ]);
}
