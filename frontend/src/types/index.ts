export type RoleName = "admin" | "secretary" | "teacher" | "student";

export interface User {
  id: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  active: boolean;
  roles: RoleName[];
}

export interface LoginResponse {
  accessToken: string;
}

export interface AuthProfile {
  id?: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  roles: RoleName[];
}

export interface AccessInfo {
  hasPassword: boolean;
  name: string;
}

export type MessageType = "ERROR" | "WARNING" | "SUCCESS";

export interface AppMessage {
  type: MessageType;
  messages: string[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ProfileStatus = "active" | "inactive";
export type StudentStatus = "active" | "locked" | "graduated" | "dropped";
export type TeacherTitle = "bachelor" | "specialist" | "master" | "doctor";
export type StaffRole = "admin" | "secretary";
export type CourseStatus = "active" | "inactive";

export interface StudentView {
  userId: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  courseId: number;
  courseName: string;
  entryYear: number;
  status: StudentStatus;
}

export interface TeacherView {
  userId: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  departmentId: number;
  departmentName: string;
  title: TeacherTitle;
  status: ProfileStatus;
}

export interface StaffView {
  userId: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  role: StaffRole;
  status: ProfileStatus;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  courseCount: number;
  teacherCount: number;
}

export interface CourseView {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  departmentName: string;
  totalSemesters: number;
  status: CourseStatus;
  studentCount: number;
}

export interface SubjectSummary {
  id: number;
  code: string;
  name: string;
  workloadHours: number;
}

export interface SubjectView extends SubjectSummary {
  description: string | null;
  prerequisites: SubjectSummary[];
  courseCount: number;
}

export interface CurriculumSubject {
  subjectId: number;
  code: string;
  name: string;
  workloadHours: number;
  mandatory: boolean;
  prerequisites: { id: number; code: string; name: string }[];
}

export interface CurriculumSemester {
  semester: number;
  workloadHours: number;
  items: CurriculumSubject[];
}

export interface CurriculumView {
  courseId: number;
  courseName: string;
  totalSemesters: number;
  totalWorkloadHours: number;
  semesters: CurriculumSemester[];
}

export interface InstitutionOverview {
  activeStudents: number;
  activeTeachers: number;
  activeCourses: number;
  subjects: number;
  departments: number;
  studentsByCourse: {
    courseId: number;
    courseName: string;
    courseCode: string;
    activeStudents: number;
  }[];
}

export interface TeacherOverview {
  department: {
    id: number;
    name: string;
    code: string;
    activeTeachers: number;
    activeStudents: number;
  };
  courses: { id: number; name: string; code: string; activeStudents: number }[];
}

export interface StudentOverview {
  registrationNumber: string | null;
  entryYear: number;
  status: StudentStatus;
  course: {
    id: number;
    name: string;
    code: string;
    departmentName: string;
    totalSemesters: number;
    curriculumWorkloadHours: number;
  };
}

export interface DashboardData {
  roles: RoleName[];
  institution?: InstitutionOverview;
  teacher?: TeacherOverview;
  student?: StudentOverview;
}

// ---------------------------------------------------------------------------
// Semester operations: calendar, classes (turmas), enrollment (inscrição),
// grades, attendance, activities and news.
// ---------------------------------------------------------------------------

export type SemesterStatus = "draft" | "active" | "closed";
export type ClassStatus = "pending" | "approved" | "rejected" | "closed";
export type EnrollmentStatus =
  | "requested"
  | "not_allocated"
  | "confirmed"
  | "cancelled"
  | "locked"
  | "approved"
  | "failed_grade"
  | "failed_attendance";
export type ProjectedResult =
  | "approved"
  | "failed_grade"
  | "failed_attendance"
  | "in_progress";

export interface AcademicCalendar {
  id: number;
  description: string;
  startDate: string;
  endDate: string;
  enrollmentStart: string;
  enrollmentEnd: string;
  withdrawalDeadline: string;
  gradesDeadline: string;
}

export interface Semester {
  id: number;
  calendarId: number;
  year: number;
  term: number;
  startDate: string;
  endDate: string;
  status: SemesterStatus;
  calendar: AcademicCalendar;
}

export interface ScheduleSlot {
  weekday: number;
  startTime: string;
  endTime: string;
  room: string | null;
}

export interface ClassView {
  id: number;
  code: string;
  status: ClassStatus;
  seats: number;
  enrolledCount: number;
  /** Pending requests, decided after the enrollment period. */
  requestedCount: number;
  availableSeats: number;
  rejectionReason: string | null;
  requestedBy: number | null;
  semester: { id: number; year: number; term: number; status: SemesterStatus };
  subject: { id: number; code: string; name: string; workloadHours: number };
  teacher: { id: number; name: string } | null;
  schedules: ScheduleSlot[];
  alreadyEnrolled?: boolean;
  myStatus?: EnrollmentStatus;
}

export interface EnrollmentView {
  id: number;
  status: EnrollmentStatus;
  requestedAt: string;
  confirmedAt: string | null;
  finalGrade: number | null;
  class: ClassView;
}

export interface RosterEntry {
  enrollmentId: number;
  studentId: number;
  name: string;
  registrationNumber: string | null;
  status: EnrollmentStatus;
  finalGrade: number | null;
}

export interface Assessment {
  id: number;
  name: string;
  weight: number;
  maxScore: number;
}

export interface StudentSummary {
  enrollmentId: number;
  studentId: number;
  name: string;
  registrationNumber: string | null;
  enrollmentStatus: EnrollmentStatus;
  grades: Record<string, number>;
  partialAverage: number | null;
  finalGrade: number | null;
  absences: number;
  absencePercent: number;
  result: ProjectedResult;
}

export interface ClassGrades {
  classId: number;
  assessments: Assessment[];
  lessonDates: string[];
  minPassingGrade: number;
  gradesOpen: boolean;
  rows: StudentSummary[];
}

export interface Reopening {
  id: number;
  classId: number;
  justification: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: number;
  decidedBy: number | null;
  openUntil: string | null;
}

export interface RollCall {
  classId: number;
  date: string | null;
  lessonDates: string[];
  students: {
    enrollmentId: number;
    studentId: number;
    name: string;
    registrationNumber: string | null;
    absences: number;
    absencePercent: number;
    present: boolean | null;
  }[];
}

export type SubmissionState = "pending" | "submitted" | "late" | "overdue";

export interface ActivityView {
  id: number;
  classId: number;
  title: string;
  description: string;
  dueAt: string;
  allowLateUntil: string | null;
  state?: SubmissionState;
  submittedAt?: string | null;
}

export interface SubmissionView {
  id: number;
  activityId: number;
  studentId: number;
  studentName?: string;
  answerText: string | null;
  fileName: string | null;
  hasFile: boolean;
  submittedAt: string;
  late: boolean;
}

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

export interface PanelClass {
  enrollmentId: number;
  enrollmentStatus: EnrollmentStatus;
  class: ClassView;
  grades: (Assessment & { assessmentId: number; value: number | null })[];
  partialAverage: number | null;
  finalGrade: number | null;
  attendance: { lessons: number; absences: number; absencePercent: number };
  result: ProjectedResult;
  activities: {
    id: number;
    title: string;
    dueAt: string;
    state: SubmissionState;
    submittedAt: string | null;
  }[];
  news: { id: number; title: string; body: string; publishedAt: string }[];
}

export interface AcademicPanel {
  minPassingGrade: number;
  classes: PanelClass[];
}

export interface AllocationResult {
  semesterId: number;
  allocated: number;
  notAllocated: number;
  classes: { classId: number; title: string; requested: number; allocated: number; notAllocated: number }[];
}
