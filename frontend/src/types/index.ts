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
