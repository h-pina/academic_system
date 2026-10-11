# Git and commits

## Approval gate

- **Never commit, squash or merge without the user's explicit approval of the changes.**
- When a task's work is done and verification passes, leave the changes **uncommitted** on the task branch and present them for review: a summary of what changed, the files touched, and the verification and test results. The user can inspect the diff with `git diff` / `git status`.
- Only after the user approves: commit on the task branch, then squash-merge into `master`.
- If the user asks for changes, make them on the same branch and present again. Approval for one round does not carry over to later changes.

## Branching per task

- Each task from `tasks/` runs on its **own new branch**, created from `master` (update the base first if needed): `task/<number>-<slug>`, e.g. `task/04-api-students`.
- Do the work on that branch. Do not commit until approved (see above); once approved, several commits on the task branch are fine.
- After approval, **merge it into `master` locally with a squash**: `git checkout master && git merge --squash task/<...>`, then create a single commit on `master`.
- **Never delete branches**: keep every task branch after merging, and keep the original branch.
- Everything is local. Do not push, open PRs, amend, rebase or force-push unless explicitly asked.

## Commits

- Use **Conventional Commits** in English: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, with an optional scope (`api`, `frontend`, `tasks`), e.g. `feat(api): add students module`.
- The squash commit on `master` has one Conventional Commit subject summarizing the task and mentions the task number in the body, e.g. `Task 04`.
- Stage files explicitly; do not use `git add -A` or `git add .`.
- Never commit `.env` files, `node_modules/`, build output, or SQLite database files (`api/data/`).
- Do not commit or merge work that fails typecheck, lint, build or tests. Report the failure instead.
- Do not start a task with uncommitted changes from other work in the tree; ask the user how to handle them first.
