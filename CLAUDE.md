# Academic System

Academic administrative system for a university: students, teachers, departments, courses, subjects and curriculum, with role-based access. The repo is being converted from a material-requisition system (see `tasks/`).

## Stack

npm workspaces monorepo, Node.js 20+.

- `api/`: NestJS 10 + TypeORM + SQLite (port 3001). Database at `api/data/app.sqlite`, schema in `api/sql/schema.sql`, seed in `api/src/seed/`.
- `frontend/`: Next.js App Router + Tailwind (port 3000).

## Commands

```bash
npm install
cp api/.env.example api/.env              # set JWT_SECRET
cp frontend/.env.example frontend/.env.local
npm run dev                               # api + frontend together

# in api/
npm run typecheck | lint | build
npm run seed:force                        # recreate seed data
```

## Where things are

- `tasks/`: the roadmap, one Portuguese markdown file per task. Start at `tasks/00-visao-geral.md`.
- `.claude/rules/`: language, git, workflow and code conventions. Follow them.
- `README.md`: still describes the old requisition system until task 01 is done.

## Key decisions

- Everyone is a row in `users`. Profiles are extensions of it (`staff`, `teachers`, `students`, keyed by `userId`); roles are derived from which tables contain the user. A user may have several profiles or none.
- Login with CPF (11 digits) or matrícula (10 digits: year + 6-digit sequence).
- Positions and requisitions are being removed.
