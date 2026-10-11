# Data model

Source of truth: the TypeORM entities in `api/src/features/**/entities/`.
SQL reference: `api/sql/schema.sql`. Design rationale: `tasks/03-modelo-de-dados.md`.

```mermaid
erDiagram
    users ||--o| staff : "is"
    users ||--o| teachers : "is"
    users ||--o| students : "is"
    departments ||--o{ courses : has
    departments ||--o{ teachers : employs
    courses ||--o{ students : enrolls
    courses ||--o{ curriculum_items : "curriculum"
    subjects ||--o{ curriculum_items : "placed in"
    subjects ||--o{ subject_prerequisites : requires

    users {
        int id PK
        string cpf UK "11 digits"
        string registration_number UK "YYYY + 6 digits, optional"
        string name
        string email UK
        string password_hash "null until first access"
        bool active
    }
    registration_sequences {
        int year PK
        int last_number "0..999999"
    }
    staff {
        int user_id PK, FK
        string role "admin | secretary"
        string status
    }
    teachers {
        int user_id PK, FK
        int department_id FK
        string title "bachelor | specialist | master | doctor"
        string status
    }
    students {
        int user_id PK, FK
        int course_id FK
        int entry_year
        string status "active | locked | graduated | dropped"
    }
    departments {
        int id PK
        string name UK
        string code UK
    }
    courses {
        int id PK
        string name
        string code UK
        int department_id FK
        int total_semesters
        string status
    }
    subjects {
        int id PK
        string code UK
        string name
        int workload_hours
        string description
    }
    curriculum_items {
        int id PK
        int course_id FK
        int subject_id FK
        int semester
        bool mandatory
    }
    subject_prerequisites {
        int subject_id PK, FK
        int prerequisite_id PK, FK
    }
```

## Profiles and roles

A person is one row in `users`. Having a profile means having a row in the
matching table, so roles are **derived**, never stored:

| Role | Derived from |
|------|--------------|
| `admin` / `secretary` | `staff.role` |
| `teacher` | a row in `teachers` |
| `student` | a row in `students` |

A user can have several profiles or none (see "users without link" in the
task). Roles are resolved on every request (never stored in the token), so
deactivating a user or a profile takes effect immediately. A staff or teacher
profile grants its role only while `status = 'active'`; a student grants
`student` unless the status is `dropped`.

## Registration number (matrícula)

`users.registration_number`: `YYYY` + 6 sequential digits, e.g. `2026000123`.
It must not have 11 digits so it can never be confused with a CPF at login.
`registration_sequences` keeps the last number issued per year; the
transaction that creates a user increments it, so numbers are never reused.

## Deletion rules

| Relation | On delete |
|----------|-----------|
| `staff`, `teachers`, `students` → `users` | `CASCADE` (a profile does not outlive its user) |
| `courses` → `departments`, `teachers` → `departments` | `RESTRICT` |
| `students` → `courses` | `RESTRICT` |
| `curriculum_items` → `courses` | `CASCADE` |
| `curriculum_items` → `subjects` | `RESTRICT` |
| `subject_prerequisites.subject_id` → `subjects` | `CASCADE` |
| `subject_prerequisites.prerequisite_id` → `subjects` | `RESTRICT` |

To end a relationship, services set `status` to inactive instead of deleting.
