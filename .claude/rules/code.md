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

## Verification before finishing

- Run in the affected workspace before calling work done: `npm run typecheck`, `npm run lint` and `npm run build`. Run tests too once they exist (task 12).
- Report failures with their output; do not mark a task done or commit while they fail.
