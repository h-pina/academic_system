import type {
  InstitutionOverview,
  StudentOverview,
  TeacherOverview,
} from "@/types";

export interface StatTile {
  label: string;
  value: string;
}

export function institutionTiles(data: InstitutionOverview): StatTile[] {
  return [
    { label: "Alunos ativos", value: String(data.activeStudents) },
    { label: "Professores ativos", value: String(data.activeTeachers) },
    { label: "Cursos ativos", value: String(data.activeCourses) },
    { label: "Disciplinas", value: String(data.subjects) },
    { label: "Departamentos", value: String(data.departments) },
  ];
}

export function teacherTiles(data: TeacherOverview): StatTile[] {
  return [
    { label: "Professores ativos", value: String(data.department.activeTeachers) },
    { label: "Alunos ativos", value: String(data.department.activeStudents) },
    { label: "Cursos", value: String(data.courses.length) },
  ];
}

export function studentTiles(data: StudentOverview): StatTile[] {
  return [
    { label: "Matrícula", value: data.registrationNumber ?? "—" },
    { label: "Ano de ingresso", value: String(data.entryYear) },
    { label: "Semestres", value: String(data.course.totalSemesters) },
    {
      label: "Carga horária da matriz",
      value: `${data.course.curriculumWorkloadHours} h`,
    },
  ];
}
