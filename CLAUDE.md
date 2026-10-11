# Academic System

Academic administrative system for a university: students, teachers, departments, courses, subjects and curriculum, with role-based access. It was converted from a material-requisition system; the roadmap to the full system is in `tasks/`.

## Stack

npm workspaces monorepo, Node.js 20+.

- `api/`: NestJS 10 + TypeORM + SQLite (port 3001). Database at `api/data/app.sqlite`, schema in `api/sql/schema.sql`, seed in `api/src/seed/`.
- `frontend/`: Next.js App Router + Tailwind (port 3005).

## Commands

```bash
npm install
cp api/.env.example api/.env              # set JWT_SECRET
cp frontend/.env.example frontend/.env.local
npm run dev                               # api + frontend together

npm test                                  # API e2e tests (Vitest + supertest, in-memory SQLite)
npm run typecheck                         # both workspaces
npm run build --workspace api
npm run seed:force --workspace api        # recreate seed data
```

## Where things are

- `tasks/`: the roadmap, one Portuguese markdown file per task. Start at `tasks/00-visao-geral.md`.
- `.claude/rules/`: language, git, workflow and code conventions. Follow them.
- `api/test/`: e2e tests; `api/vitest.config.ts` configures the runner (SWC for decorator metadata).

## Key decisions

- Everyone is a row in `users`. Profiles are extensions of it (`staff`, `teachers`, `students`, keyed by `userId`); roles are derived from which tables contain the user. A user may have several profiles or none.
- Login with CPF (11 digits) or matrícula (10 digits: year + 6-digit sequence).
- Data model: see `docs/data-model.md`. Constraints (CHECKs, FKs, uniqueness) are enforced in the database and covered by `api/test/data-model.e2e-spec.ts`.
- `users.role_id` is transitional; task 02 replaces it with derived roles and removes it.
- Schema is created by TypeORM `synchronize` outside production; there are no migrations yet.
- Positions and requisitions were removed in task 01.
