Monorepo for the **Academic System**: an administrative system for a university
(students, teachers, departments, courses and subjects), built as a NestJS backend
and a Next.js web client, managed as npm workspaces.

It manages people (administrative staff, teachers and students), departments,
courses, subjects and each course's curriculum with prerequisites, with
role-based access and sign-in by CPF or matrícula. The roadmap and the
decisions behind each feature are in [`tasks/`](tasks/00-visao-geral.md).

| Workspace   | Stack                        | Default port | Description |
|-------------|------------------------------|--------------|-------------|
| `api`       | NestJS 10 + TypeORM (SQLite) | `3001`       | REST API: authentication, people, academic structure, curriculum and dashboard. |
| `frontend`  | Next.js (App Router)         | `3005`       | Web client that talks to `api`. UI in Portuguese (pt-BR). |
| `e2e`       | Puppeteer + pixelmatch       |              | Browser flows and visual regression (see below). |

## Requirements

- Node.js 20+

## Quick start

```bash
npm install

# copy env templates and set secrets
cp api/.env.example api/.env            # set JWT_SECRET
cp frontend/.env.example frontend/.env.local

npm run dev
```

`npm run dev` runs both workspaces together (`api` on `http://localhost:3001`,
`frontend` on `http://localhost:3005`). On its first boot the API creates the
SQLite file at `api/data/app.sqlite` and seeds it with the baseline data below.

## Accounts

Seeded automatically into an empty database by `api` (`api/src/seed/seed-data.ts`).
The CPFs have valid check digits but do not belong to real people. Sign in with
the **CPF** or **matrícula** and password.

| CPF           | Matrícula    | Name             | Profile (role)                          | Password      |
|---------------|--------------|------------------|-----------------------------------------|---------------|
| `12345678909` |              | Alice Admin      | staff (`admin`)                         | `password123` |
| `98765432100` |              | Bob Secretary    | staff (`secretary`)                     | `password123` |
| `11122233396` |              | Carol Teacher    | teacher, Computer Science               | `password123` |
| `12121212108` |              | Frank Teacher    | teacher, Mathematics                    | `password123` |
| `22233344405` |              | Grace Teacher    | teacher, Computer Science               | `password123` |
| `11144477735` | `2026000001` | Erin Student     | student, Computer Science               | `password123` |
| `44455566619` | `2025000002` | Ivan Student     | student, Computer Science               | `password123` |
| `55566677720` | `2026000002` | Judy Student     | student, Mathematics                    | `password123` |
| `66677788830` | `2024000001` | Karl Locked      | student (locked), Computer Science      | `password123` |
| `77788899941` | `2020000001` | Liam Graduated   | student (graduated), Mathematics        | `password123` |
| `33344455508` | `2025000001` | Heidi Both       | teacher (Computer Science) **and** student (Mathematics) | `password123` |
| `88899911193` |              | Mallory Unlinked | _(none: no profile linked)_             | `password123` |
| `45678912364` |              | Dave Pending     | _(none: no profile linked)_             | _(none — set on first login via the "set your password" flow)_ |

The seed also creates two departments (Computer Science, Mathematics), two
courses (`CC`, `MAT`), twelve subjects with prerequisites and the curriculum of
both courses. It is idempotent: it only populates empty tables, and
`npm run seed:force --workspace api` recreates the seeded rows.

Sign in with the **CPF** (11 digits) or the **matrícula** (10 digits).

## Roles

Roles are not stored: they are derived from which profile tables contain the
user (`staff.role`, `teachers`, `students`). A user can have several roles or
none; a user without a profile can sign in but only sees a "no link" notice.
`admin` includes every permission of `secretary`. A staff or teacher profile
grants its role only while `status = 'active'`; a student keeps the `student`
role unless the status is `dropped`. Roles are resolved on every request, so
deactivating a user or a profile takes effect immediately.

## API reference

All routes except the public ones below need `Authorization: Bearer <token>`.
"Any profile" means any signed-in user that has at least one role. A
ready-to-use [Postman collection](api/postman_collection.json) covers every
route.

| Area | Route | Roles |
|------|-------|-------|
| Auth | `POST /auth/login` `{ identifier, password }` (CPF or matrícula) | public |
| Auth | `GET /auth/access/:identifier`, `PUT /auth/password/reset` | public |
| Auth | `GET /auth/me` | any signed-in user |
| Users | `GET /users`, `GET /users/orphans`, `POST /users`, `PUT /users/:cpf`, `DELETE /users/:cpf` | `admin` |
| Users | `GET /users/:cpf/exists` | `admin`, `secretary` |
| Users | `PUT /users/me`, `GET /users/:cpf/email` | any signed-in user / public |
| Staff | `GET/POST /staff`, `GET/PATCH/DELETE /staff/:id` | `admin` |
| Students | `GET /students`, `GET /students/:id` | `admin`, `secretary`, `teacher` (a student: own record) |
| Students | `POST /students`, `PATCH /students/:id` | `admin`, `secretary` |
| Students | `DELETE /students/:id` | `admin` |
| Teachers | `GET /teachers`, `GET /teachers/:id` | `admin`, `secretary`, `teacher` |
| Teachers | `POST /teachers`, `PATCH /teachers/:id` | `admin`, `secretary` |
| Teachers | `DELETE /teachers/:id` | `admin` |
| Departments, courses, subjects | `GET` (list, by id) | any profile |
| Departments, courses, subjects | `POST`, `PATCH` | `admin`, `secretary` |
| Departments, courses, subjects | `DELETE` | `admin` |
| Curriculum | `GET /courses/:id/curriculum` | any profile |
| Curriculum | `POST`, `PATCH`, `DELETE /courses/:id/curriculum[/:subjectId]` | `admin`, `secretary` |
| Prerequisites | `PUT /subjects/:id/prerequisites` | `admin`, `secretary` |
| Dashboard | `GET /dashboard` | any profile (sections depend on roles) |

List endpoints are paginated (`page`, `pageSize` up to 100) and answer
`{ items, total, page, pageSize }`, except departments, which return an array.
Students, teachers, staff, courses and subjects also accept `sort` (a column
from a fixed list per endpoint) and `order` (`asc` or `desc`); anything else is
a 400. Validation failures answer 400 with `message` (a list of Portuguese
messages) and `errors` (`[{ field, message }]`) so a form can mark each field.
Rules enforced by the API are listed in the task files under `tasks/` and
covered by the e2e tests in `api/test/`.

## Data model

Entity-relationship diagram and deletion rules: [`docs/data-model.md`](docs/data-model.md).

## Tests and quality checks

```bash
npm test               # API e2e + unit tests (in-memory SQLite) and frontend unit tests
npm run typecheck      # typechecks both workspaces
npm run lint           # ESLint in both workspaces
npm run build          # builds both workspaces
```

The API tests boot the whole application on an in-memory database seeded with
the sample data, so they need no setup and never touch `api/data/app.sqlite`.

### Browser tests

```bash
npm run test:e2e            # real-browser flows and visual regression
npm run test:visual:update  # rewrite the reference screenshots
```

They need a browser (`BROWSER_PATH`, or `firefox`/`chromium`/`chrome` on the
`PATH`) and skip with a warning without one. Details, the screenshot
tolerance and how to update references: [`e2e/README.md`](e2e/README.md).

## Environment variables

| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `JWT_SECRET` | `api/.env` | _(required)_ | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | `api/.env` | `1d` | Token lifetime |
| `PORT` | `api/.env` | `3001` | API port |
| `DATABASE_PATH` | `api/.env` | `data/app.sqlite` | SQLite file |
| `BCRYPT_SALT_ROUNDS` | `api/.env` | `12` | Password hashing cost |
| `SEED_ON_STARTUP` | `api/.env` | `true` outside production | Populate empty tables with the sample data |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:3001` | API base URL used by the browser |

> Outside production the schema is created by TypeORM `synchronize`; there are
> no migrations yet, so add them before any real deployment.
