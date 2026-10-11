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
the **CPF** (digits only) and password.

| CPF           | Name          | Role (`roleId`)     | Password      |
|---------------|---------------|---------------------|---------------|
| `12345678909` | Alice Admin   | Administrator (1)   | `password123` |
| `98765432100` | Bob Manager   | Manager (2)         | `password123` |
| `11122233396` | Carol Analyst | Analyst (3)         | `password123` |
| `45678912364` | Dave Pending  | Analyst (3)         | _(none — set on first login via the "set your password" flow)_ |

## Data model

Entity-relationship diagram and deletion rules: [`docs/data-model.md`](docs/data-model.md).

## Tests

```bash
npm test               # runs the API e2e tests (in-memory SQLite, no setup needed)
npm run typecheck      # typechecks both workspaces
```
