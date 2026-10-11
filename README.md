Monorepo for the **Academic System**: an administrative system for a university
(students, teachers, departments, courses and subjects), built as a NestJS backend
and a Next.js web client, managed as npm workspaces.

> The domain features are being built task by task; see `tasks/`. For now the
> system provides authentication and user registration.

| Workspace   | Stack                        | Default port | Description |
|-------------|------------------------------|--------------|-------------|
| `api`       | NestJS 10 + TypeORM (SQLite) | `3001`       | Authentication (CPF + password) and user registration. |
| `frontend`  | Next.js (App Router)         | `3005`       | Web client that talks to `api`. |

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
`admin` includes every permission of `secretary`.

| Route | Roles |
|-------|-------|
| `GET /users`, `POST /users`, `PUT /users/:cpf`, `DELETE /users/:cpf` | `admin` |
| `GET /users/:cpf/exists` | `admin`, `secretary` |
| `GET /auth/me`, `PUT /users/me` | any signed-in user (profile not required) |

## Data model

Entity-relationship diagram and deletion rules: [`docs/data-model.md`](docs/data-model.md).

## Tests

```bash
npm test               # runs the API e2e tests (in-memory SQLite, no setup needed)
npm run typecheck      # typechecks both workspaces
```
