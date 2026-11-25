# LGPD: personal data handling

Covers RNF05. This is the technical inventory and the controls implemented in the system; the legal basis, the
privacy notice and the appointment of the *encarregado* (DPO) belong to the institution.

## Personal data kept

| Data | Where | Purpose | Who can read it |
|------|-------|---------|-----------------|
| CPF, name, e-mail | `users` | Identification and sign-in | Staff (all); the person (own) |
| Registration number (matrícula) | `users` | Identification and sign-in | Staff, the person; teachers see it on their class roll |
| Password (bcrypt hash) | `users.password_hash` | Authentication | Nobody; never returned by the API |
| Grades, attendance | `grades`, `attendance_records` | Academic record | The student (own), the responsible teacher, staff |
| Submitted work | `submissions` and `UPLOAD_DIR` | Evaluation | The student (own), the responsible teacher, staff |
| Audit trail | `audit_log` | Accountability of critical actions | Administrator only |

## Controls in the code

- **Least privilege:** every route declares its roles; a student sees only their own classes' data, a teacher only
  their own classes (RN11–RN13, covered by tests).
- **No public personal data:** `GET /users/:cpf/email` now requires staff. `GET /auth/access/:identifier` stays public
  because the two-step sign-in of the specification needs it; it returns only `hasPassword` and the person's name, and is rate limited.
- **Passwords:** bcrypt; the public first-access route can no longer overwrite an existing password.
- **Failed sign-ins** are audited with the identifier masked (`***123`).
- **Audit trail:** enrollment, class approval, grade and attendance changes, reopening of grades, calendar changes,
  report exports, settings and first access write to `audit_log` with actor, time and entity.
- **Transport and headers:** security headers on every response; HSTS in production; CORS restricted by `CORS_ORIGIN`.
- **Uploads:** type and size limited, stored outside the web root with generated names, served only after an
  authorization check.
- **Backups** contain personal data: keep them encrypted at rest and restrict access (see `operations.md`).

## Data subject requests (art. 18)

| Request | How it is served today |
|---------|------------------------|
| Confirmation and access | The person sees their data in *Meus dados* and the academic panel. A full export is available to the secretariat through the API (`GET /users`, class reports). |
| Correction | The person edits name and e-mail; staff correct the rest. |
| Deletion / anonymization | Not automated on purpose: academic records must be kept by law. Profiles are inactivated instead of deleted (project rule). A request is handled by the administrator case by case. |

## Open items for the institution

- Retention period for `audit_log` and old submissions (suggestion: 5 years for academic records, 1 year for failed
  sign-in events).
- Privacy notice shown at first access.
- Encryption of the disk or volume holding `data/`.
