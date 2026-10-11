# Code and architecture

## API structure

- One folder per feature under `api/src/features/<name>/`, with `dto/`, `entities/`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.repository.ts` and `<name>.module.ts`, as in the existing `users` feature.
- Controllers stay thin (routing, guards, DTOs); business rules live in services; data access lives in repositories.
- Register every new module in `app.module.ts`.

## Validation and errors

- Validate all input with DTOs and `class-validator`; do not trust request bodies.
- Throw Nest HTTP exceptions with clear messages: `409` for duplicates, `404` for missing resources, `403` for insufficient permissions, `400` for rule violations.
- Protect routes with `@Roles(...)`; no route is public unless it is explicitly meant to be.

## Transactions and integrity

- Creating a person together with a profile (`users` + `students`/`teachers`/`staff`) always happens in a **single transaction**.
- Reuse an existing `users` row when the CPF already exists; never duplicate it.
- Do not delete profile rows to end a relationship: set `status` to inactive. Deleting only removes the profile row, never `users`.
- Never remove, deactivate or demote the last active `admin`.
- Roles are derived from `staff`, `teachers` and `students`; never store a teacher or student role separately.

## Tests

- **Every feature must be covered by tests that prove it works.** A task is not done until its behavior is tested.
- Cover each acceptance criterion of the task with at least one test, including the failure paths (duplicates, missing resources, forbidden access, invalid input) and the integrity rules above (transactions, last admin, inactivation).
- API: unit tests for services and guards; e2e tests (`supertest`) for endpoints, covering the HTTP status codes and permissions per role.
- Frontend: test the logic and components that carry rules (forms, validation, role-based visibility); do not test purely presentational markup.
- Fix bugs with a test that fails first, then the fix.
- Never weaken, skip or delete a test to make a task pass; report the problem instead.
- Tests must be deterministic and use their own database, never `api/data/app.sqlite`.

## Verification before finishing

- Run in the affected workspace before calling work done: `npm run typecheck`, `npm run lint`, `npm run build` and `npm test`.
- Report failures with their output; do not mark a task done, ask for approval or commit while they fail.
