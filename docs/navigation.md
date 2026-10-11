# Navigation by profile

Each kind of person finds the modules that match what they do, instead of one
shared catalogue filtered by permission. The definition lives in
`frontend/src/config/navigation.ts`; `frontend/src/lib/access.ts` builds a
user's navigation and answers "can this user open this route?".

| Profile | Section | Modules |
|---------|---------|---------|
| Student | (none) | Meu curso, Minha matriz, Disciplinas do curso, Meus dados |
| Teacher | (none) | Meu departamento, Alunos, Cursos e matrizes, Disciplinas, Meus dados |
| Secretary | Pessoas | Alunos, Professores |
| | Estrutura acadêmica | Departamentos, Cursos e matrizes, Disciplinas |
| | Conta | Meus dados |
| Admin | the secretary's sections plus | Administração: Funcionários, Usuários |
| No profile | (none) | only Meus dados; everything else shows the "no link" notice |

A person with several kinds of profile gets one block per kind, headed
"Como professor" and "Como aluno" (staff keep their own sections). A module
offered by two kinds appears once.

## The new screens

| Route | For | Content | Data |
|-------|-----|---------|------|
| `/app/my-course` | student | Course, department, status, matrícula, hours | `GET /dashboard` |
| `/app/my-curriculum` | student | Own course's curriculum by semester | `GET /courses/:id/curriculum` |
| `/app/my-subjects` | student | Subjects of the own course, searchable | `GET /subjects?courseId=` |
| `/app/my-department` | teacher | Indicators, courses, colleagues | `GET /dashboard`, `GET /teachers?departmentId=` |
| `/app/profile` | everyone | Name, e-mail, matrícula, password | `GET /auth/me`, `PUT /users/me` |

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
