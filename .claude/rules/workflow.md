# Working with tasks/

- Work on **one task at a time**, in the order given by `tasks/00-visao-geral.md`.
- Before starting, read the task file and check its **Depends on** line. If a dependency is not done, say so and stop instead of working around it.
- Create the task branch from `master` before changing anything (see `git.md`).
- Briefly state what you are about to change, then implement.
- Task files may list open decisions (e.g. how the yearly sequence is controlled, `synchronize` vs. `schema.sql`). Ask the user instead of assuming; record the decision in the task file once made.
- As work progresses, tick the checklist items (`- [x]`) in the task file. Do not rewrite or reword tasks unless asked; if the plan needs to change, propose the change first.
- Write the tests for the task's behavior as part of the task, not afterwards (see `code.md`).
- When the acceptance criteria are met and typecheck, lint, build and tests pass, **stop and present the uncommitted changes for review**: what changed, which files, how each acceptance criterion is covered by a test, and the verification output.
- Commit and squash-merge into `master` only after the user approves (see `git.md`). Keep the branch. Then stop; do not start the next task on your own.
- If something outside the task's scope needs fixing, mention it instead of fixing it silently.
