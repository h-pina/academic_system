import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { CurriculumItem } from '../courses/entities/curriculum-item.entity';
import { Department } from '../departments/entities/department.entity';
import { Student } from '../students/entities/student.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { User } from '../users/entities/user.entity';
import { hasAnyRole } from '../../common/domain/roles';
import { AuthUser } from '../auth/auth-user.interface';
import { StudentStatus } from '../../common/domain/domain.constants';

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

export interface Dashboard {
  roles: AuthUser['roles'];
  institution?: InstitutionOverview;
  teacher?: TeacherOverview;
  student?: StudentOverview;
}

/**
 * Summary numbers for the home screen. Each section is included only when
 * the user holds the matching role, so a user with several roles gets the
 * union of them.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(CurriculumItem)
    private readonly curriculum: Repository<CurriculumItem>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async forUser(user: AuthUser): Promise<Dashboard> {
    const dashboard: Dashboard = { roles: user.roles };

    if (hasAnyRole(user.roles, ['secretary'])) {
      dashboard.institution = await this.institution();
    }
    if (hasAnyRole(user.roles, ['teacher'])) {
      dashboard.teacher = await this.teacher(user.userId);
    }
    if (hasAnyRole(user.roles, ['student'])) {
      dashboard.student = await this.student(user.userId);
    }
    return dashboard;
  }

  private async institution(): Promise<InstitutionOverview> {
    const [
      activeStudents,
      activeTeachers,
      activeCourses,
      subjects,
      departments,
      courses,
    ] = await Promise.all([
      this.students.countBy({ status: 'active' }),
      this.teachers.countBy({ status: 'active' }),
      this.courses.countBy({ status: 'active' }),
      this.subjects.count(),
      this.departments.count(),
      this.courses.find({ order: { name: 'ASC' } }),
    ]);

    const studentsByCourse = await Promise.all(
      courses.map(async (course) => ({
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        activeStudents: await this.students.countBy({
          courseId: course.id,
          status: 'active',
        }),
      })),
    );

    return {
      activeStudents,
      activeTeachers,
      activeCourses,
      subjects,
      departments,
      studentsByCourse,
    };
  }

  private async teacher(userId: number): Promise<TeacherOverview> {
    const teacher = await this.teachers.findOne({
      where: { userId },
      relations: { department: true },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const { department } = teacher;
    const courses = await this.courses.find({
      where: { departmentId: department.id },
      order: { name: 'ASC' },
    });

    const courseRows = await Promise.all(
      courses.map(async (course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        activeStudents: await this.students.countBy({
          courseId: course.id,
          status: 'active',
        }),
      })),
    );

    return {
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        activeTeachers: await this.teachers.countBy({
          departmentId: department.id,
          status: 'active',
        }),
        activeStudents: courseRows.reduce(
          (sum, course) => sum + course.activeStudents,
          0,
        ),
      },
      courses: courseRows,
    };
  }

  private async student(userId: number): Promise<StudentOverview> {
    const student = await this.students.findOne({
      where: { userId },
      relations: { course: { department: true } },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    const user = await this.users.findOneByOrFail({ id: userId });

    const hours = await this.curriculum
      .createQueryBuilder('item')
      .innerJoin('item.subject', 'subject')
      .select('COALESCE(SUM(subject.workloadHours), 0)', 'total')
      .where('item.courseId = :courseId', { courseId: student.courseId })
      .getRawOne<{ total: string | number }>();

    return {
      registrationNumber: user.registrationNumber,
      entryYear: student.entryYear,
      status: student.status,
      course: {
        id: student.course.id,
        name: student.course.name,
        code: student.course.code,
        departmentName: student.course.department.name,
        totalSemesters: student.course.totalSemesters,
        curriculumWorkloadHours: Number(hours?.total ?? 0),
      },
    };
  }
}
