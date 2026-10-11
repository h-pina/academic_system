# Git and commits

## Approval gate

- The user **waived per-task review** (instruction given after task 03): once a task passes verification (typecheck, build, tests), commit it on the task branch and squash-merge it into `master` without asking.
- The gate still applies to anything that is **not** a routine task merge: pushing, deleting branches, rewriting history, or changes outside the task's scope.
- Stop and report instead of merging when verification fails, when an acceptance criterion cannot be met, or when an open decision cannot be settled with a sensible default.
- Record every decision taken without asking in the task file, so the user can audit it afterwards.

## Branching per task

- Each task from `tasks/` runs on its **own new branch**, created from `master` (update the base first if needed): `task/<number>-<slug>`, e.g. `task/04-api-students`.
- Do the work on that branch. Several commits on the task branch are fine.
- After verification passes, **merge it into `master` locally with a squash**: `git checkout master && git merge --squash task/<...>`, then create a single commit on `master`.
- **Never delete branches**: keep every task branch after merging, and keep the original branch.
- Everything is local. Do not push, open PRs, amend, rebase or force-push unless explicitly asked.

## Commits

- Use **Conventional Commits** in English: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, with an optional scope (`api`, `frontend`, `tasks`), e.g. `feat(api): add students module`.
- The squash commit on `master` has one Conventional Commit subject summarizing the task and mentions the task number in the body, e.g. `Task 04`.
- Stage files explicitly; do not use `git add -A` or `git add .`.
- Never commit `.env` files, `node_modules/`, build output, or SQLite database files (`api/data/`).
- Do not commit or merge work that fails typecheck, lint, build or tests. Report the failure instead.
- Do not start a task with uncommitted changes from other work in the tree; ask the user how to handle them first.
