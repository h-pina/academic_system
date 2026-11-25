import type { RoleName } from "@/types";

/**
 * Navigation of the application, designed per profile: each kind of user
 * finds the modules that match what they do, not a shared catalogue
 * filtered by permission.
 */

export type IconKey =
  | "profile"
  | "my-course"
  | "curriculum"
  | "subjects"
  | "department"
  | "students"
  | "teachers"
  | "departments"
  | "courses"
  | "staff"
  | "users"
  | "calendar"
  | "classes"
  | "enrollment"
  | "panel"
  | "news"
  | "reopenings"
  | "components";

export interface NavItem {
  /** First path segment under `/app`. */
  route: string;
  label: string;
  /** One line shown on the home screen cards. */
  description: string;
  icon: IconKey;
}

export interface NavSection {
  id: string;
  /** Section heading; absent for a profile's single, untitled section. */
  title?: string;
  items: NavItem[];
}

/** Every module of the application, by route. */
export const ITEMS = {
  "my-course": {
    route: "my-course",
    label: "Meu curso",
    description: "Seu curso, a matriz com o que você já cursou e a carga horária restante.",
    icon: "my-course",
  },
  "my-department": {
    route: "my-department",
    label: "Meu departamento",
    description: "Indicadores, cursos e colegas do seu departamento.",
    icon: "department",
  },
  profile: {
    route: "profile",
    label: "Meus dados",
    description: "Seu nome, e-mail, matrícula e senha.",
    icon: "profile",
  },
  students: {
    route: "students",
    label: "Alunos",
    description: "Consulte e cadastre alunos, cursos e situação acadêmica.",
    icon: "students",
  },
  teachers: {
    route: "teachers",
    label: "Professores",
    description: "Consulte e cadastre professores e seus departamentos.",
    icon: "teachers",
  },
  departments: {
    route: "departments",
    label: "Departamentos",
    description: "Departamentos acadêmicos, seus cursos e professores.",
    icon: "departments",
  },
  courses: {
    route: "courses",
    label: "Cursos e matrizes",
    description: "Cursos e a matriz curricular de cada um.",
    icon: "courses",
  },
  subjects: {
    route: "subjects",
    label: "Disciplinas",
    description: "Disciplinas, cargas horárias e pré-requisitos.",
    icon: "subjects",
  },
  staff: {
    route: "staff",
    label: "Funcionários",
    description: "Administradores e secretaria do sistema.",
    icon: "staff",
  },
  calendar: {
    route: "calendar",
    label: "Calendário acadêmico",
    description: "Períodos letivos, semestres e os prazos de inscrição, cancelamento e notas.",
    icon: "calendar",
  },
  classes: {
    route: "classes",
    label: "Turmas",
    description: "Turmas do semestre: aprovação, professores, horários, notas e frequência.",
    icon: "classes",
  },
  enrollment: {
    route: "enrollment",
    label: "Inscrição em turmas",
    description: "Consulte as turmas abertas e inscreva-se no semestre.",
    icon: "enrollment",
  },
  panel: {
    route: "panel",
    label: "Painel acadêmico",
    description: "Suas notas, frequência, atividades e avisos por turma.",
    icon: "panel",
  },
  news: {
    route: "news",
    label: "Avisos",
    description: "Notícias e avisos das turmas e da instituição.",
    icon: "news",
  },
  reopenings: {
    route: "reopenings",
    label: "Liberação de notas",
    description: "Solicitações de lançamento de notas fora do prazo.",
    icon: "reopenings",
  },
  "register-users": {
    route: "register-users",
    label: "Usuários",
    description: "Pessoas com acesso ao sistema, inclusive as sem vínculo.",
    icon: "users",
  },
} as const satisfies Record<string, NavItem>;

type Route = keyof typeof ITEMS;
const items = (...routes: Route[]): NavItem[] =>
  routes.map((route) => ITEMS[route]);

/** What a student finds: their own path through the course. */
export const STUDENT_SECTIONS: NavSection[] = [
  {
    id: "student",
    items: items(
      "panel",
      "enrollment",
      "news",
      "calendar",
      "my-course",
      "profile",
    ),
  },
];

/** What a teacher finds: their department, the students, the catalogue. */
export const TEACHER_SECTIONS: NavSection[] = [
  {
    id: "teacher",
    items: items(
      "classes",
      "news",
      "calendar",
      "my-department",
      "students",
      "courses",
      "subjects",
      "profile",
    ),
  },
];

const PEOPLE: NavSection = {
  id: "people",
  title: "Pessoas",
  items: items("students", "teachers"),
};
const ACADEMIC: NavSection = {
  id: "academic",
  title: "Estrutura acadêmica",
  items: items("departments", "courses", "subjects"),
};
const OPERATION: NavSection = {
  id: "operation",
  title: "Operação acadêmica",
  items: items("calendar", "classes", "reopenings", "news"),
};
const ADMINISTRATION: NavSection = {
  id: "administration",
  title: "Administração",
  items: items("staff", "register-users"),
};
const ACCOUNT: NavSection = {
  id: "account",
  title: "Conta",
  items: items("profile"),
};

/** The secretariat manages people and the academic structure. */
export const SECRETARY_SECTIONS: NavSection[] = [PEOPLE, ACADEMIC, OPERATION, ACCOUNT];

/** The administrator adds user and staff management. */
export const ADMIN_SECTIONS: NavSection[] = [
  PEOPLE,
  ACADEMIC,
  OPERATION,
  ADMINISTRATION,
  ACCOUNT,
];

/** Titles used when a person holds more than one kind of profile. */
export const KIND_TITLES: Record<"teacher" | "student", string> = {
  teacher: "Como professor",
  student: "Como aluno",
};

/**
 * Routes reachable by URL that are not in any menu (internal tools).
 * They need only a signed-in user with a profile.
 */
export const HIDDEN_ROUTES: Record<string, string> = {
  design: "Componentes",
};

/**
 * Routes a signed-in user can open even with no profile linked yet: they
 * may always see and fix their own data (the API allows `PUT /users/me`).
 */
export const NO_PROFILE_ROUTES: readonly string[] = ["profile"];

export const ALL_ROLES: readonly RoleName[] = [
  "admin",
  "secretary",
  "teacher",
  "student",
];
