# Navigation by profile

Each kind of person finds the modules that match what they do, instead of one
shared catalogue filtered by permission. The definition lives in
`frontend/src/config/navigation.ts`; `frontend/src/lib/access.ts` builds a
user's navigation and answers "can this user open this route?".

| Profile | Section | Modules |
|---------|---------|---------|
| Student | (none) | Painel acadêmico, Inscrição em turmas, Avisos, Calendário acadêmico, Meu curso, Meus dados |
| Teacher | (none) | Turmas, Avisos, Calendário acadêmico, Meu departamento, Alunos, Cursos e matrizes, Disciplinas, Meus dados |
| Secretary | Pessoas | Alunos, Professores |
| | Estrutura acadêmica | Departamentos, Cursos e matrizes, Disciplinas |
| | Operação acadêmica | Calendário acadêmico, Turmas, Liberação de notas, Avisos |
| | Conta | Meus dados |
| Admin | the secretary's sections plus | Administração: Funcionários, Usuários |
| No profile | (none) | only Meus dados; everything else shows the "no link" notice |

A person with several kinds of profile gets one block per kind, headed
"Como professor" and "Como aluno" (staff keep their own sections). A module
offered by two kinds appears once.

## The new screens

| Route | For | Content | Data |
|-------|-----|---------|------|
| `/app/my-course` | student | Own course, progress (hours passed and remaining) and curriculum by semester | `GET /dashboard`, `GET /courses/:id/curriculum`, `GET /enrollments/me` |
| `/app/my-course/subjects` | student | Subjects of the own course, searchable (button "Ver lista de disciplinas" in Meu curso) | `GET /subjects?courseId=` |
| `/app/my-department` | teacher | Indicators, courses, colleagues | `GET /dashboard`, `GET /teachers?departmentId=` |
| `/app/profile` | everyone | Name, e-mail, matrícula, password | `GET /auth/me`, `PUT /users/me` |
| `/app/calendar` | everyone reads; staff write | Calendars with their deadlines and the semesters (create, deploy, close) | `/calendars`, `/semesters` |
| `/app/classes` | teacher, staff | Classes with filters; create, request (teacher), approve, reject | `/classes`, `/classes/requests` |
| `/app/classes/[classId]` | teacher, staff | Summary and roster; tabs Notas, Frequência, Atividades, Avisos; reports CSV/PDF | `/classes/:id/*`, `/assessments/:id/grades` |
| `/app/enrollment` | student | Open classes (subject, teacher, schedule, seats), enroll, cancel, lock | `/classes/available`, `/enrollments` |
| `/app/panel` | student | Grades, attendance, activities (with delivery) and news per class | `GET /me/academic-panel` |
| `/app/news` | everyone reads; teacher, staff write | Notices of the user's classes and the institution | `/news` |
| `/app/reopenings` | staff | Requests to post grades after the deadline | `/grade-reopenings` |

## What is and is not enforced

Navigation and route protection are **interface** decisions. The API's role
guards (see the README) are the security boundary, and they are unchanged: for
example a student's token can still call `GET /courses`, the interface simply
does not offer it. A student's subject list is narrowed with the `courseId`
filter, and the teacher keeps access to every student, as before.

## Adding a module

1. Add the item to `ITEMS` in `config/navigation.ts`.
2. List it in the sections of the profiles that should see it.
3. Create `app/app/<route>/page.tsx`.

`canAccessRoute` and the sidebar, the home cards and the page title all derive
from that single definition. `access.test.ts` holds the matrix per profile.
