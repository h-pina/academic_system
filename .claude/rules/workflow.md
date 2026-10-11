# Working with tasks/

- Work on **one task at a time**, in the order given by `tasks/00-visao-geral.md`.
- Before starting, read the task file and check its **Depends on** line. If a dependency is not done, say so and stop instead of working around it.
- Create the task branch from `master` before changing anything (see `git.md`).
- Briefly state what you are about to change, then implement.
- Task files may list open decisions (e.g. how the yearly sequence is controlled, `synchronize` vs. `schema.sql`). Ask the user instead of assuming; record the decision in the task file once made.
- As work progresses, tick the checklist items (`- [x]`) in the task file. Do not rewrite or reword tasks unless asked; if the plan needs to change, propose the change first.
- Write the tests for the task's behavior as part of the task, not afterwards (see `code.md`).
- When the acceptance criteria are met and typecheck, build and tests pass, commit on the task branch and squash-merge into `master` (see `git.md`). Keep the branch.
- After merging, report briefly what was done, which decisions were taken, and anything the user should know, then continue with the next task in the order given by `tasks/00-visao-geral.md`, unless the user said to stop.
- Task files list open decisions: when the user is not available to answer, choose the sensible default, apply it, and record it in the task file.
- If something outside the task's scope needs fixing, mention it instead of fixing it silently.
