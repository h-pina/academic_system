-- Reference schema (SQLite dialect).
--
-- With `synchronize: true` (the default outside production - see
-- src/app.module.ts) TypeORM creates and migrates these tables
-- automatically from the entity classes under
-- src/features/**/entities/*.entity.ts. The entities are the source of truth;
-- this file is hand-maintained documentation of the resulting shape.
-- There are no migrations yet: add them before any production deployment.
--
-- Entity-relationship diagram: docs/data-model.md

-- Identity and credentials of every person. Profiles are 1:1 extensions
-- (staff, teachers, students) keyed by users.id; roles are derived from
-- which of those tables contain the user.
CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
  cpf                  TEXT     NOT NULL UNIQUE,   -- 11 digits
  registration_number  TEXT     UNIQUE,            -- matricula: YYYY + 6 digits, optional
  name                 TEXT     NOT NULL,
  email                TEXT     NOT NULL UNIQUE,
  role_id              INTEGER  NOT NULL,          -- TRANSITIONAL: removed in task 02
  password_hash        TEXT,                       -- bcrypt; NULL until first access
  active               INTEGER  NOT NULL DEFAULT 1,
  CHECK (length(cpf) = 11 AND cpf NOT GLOB '*[^0-9]*'),
  CHECK (registration_number IS NULL
         OR (length(registration_number) = 10
             AND registration_number NOT GLOB '*[^0-9]*'))
);

-- Last sequence issued per year, so a registration number is never reused.
CREATE TABLE IF NOT EXISTS registration_sequences (
  year         INTEGER  PRIMARY KEY,
  last_number  INTEGER  NOT NULL DEFAULT 0,
  CHECK (last_number BETWEEN 0 AND 999999)
);

CREATE TABLE IF NOT EXISTS departments (
  id    INTEGER  PRIMARY KEY AUTOINCREMENT,
  name  TEXT     NOT NULL UNIQUE,
  code  TEXT     NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS courses (
  id              INTEGER  PRIMARY KEY AUTOINCREMENT,
  name            TEXT     NOT NULL,
  code            TEXT     NOT NULL UNIQUE,
  department_id   INTEGER  NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  total_semesters INTEGER  NOT NULL CHECK (total_semesters >= 1),
  status          TEXT     NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  code           TEXT     NOT NULL UNIQUE,
  name           TEXT     NOT NULL,
  workload_hours INTEGER  NOT NULL CHECK (workload_hours >= 1),
  description    TEXT
);

-- A subject placed in a course's curriculum (matriz curricular).
CREATE TABLE IF NOT EXISTS curriculum_items (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER  NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  subject_id  INTEGER  NOT NULL REFERENCES subjects (id) ON DELETE RESTRICT,
  semester    INTEGER  NOT NULL CHECK (semester >= 1),
  mandatory   INTEGER  NOT NULL DEFAULT 1,
  UNIQUE (course_id, subject_id)
);

-- subject_id requires prerequisite_id. Cycles are rejected by the service
-- layer (task 07); the database only forbids self-reference and duplicates.
CREATE TABLE IF NOT EXISTS subject_prerequisites (
  subject_id       INTEGER  NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
  prerequisite_id  INTEGER  NOT NULL REFERENCES subjects (id) ON DELETE RESTRICT,
  PRIMARY KEY (subject_id, prerequisite_id),
  CHECK (subject_id <> prerequisite_id)
);

-- Profiles: a user has a profile if, and only if, a row exists here.
CREATE TABLE IF NOT EXISTS staff (
  user_id  INTEGER  PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  role     TEXT     NOT NULL CHECK (role IN ('admin', 'secretary')),
  status   TEXT     NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS teachers (
  user_id        INTEGER  PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  department_id  INTEGER  NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  title          TEXT     NOT NULL
                          CHECK (title IN ('bachelor', 'specialist', 'master', 'doctor')),
  status         TEXT     NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS students (
  user_id     INTEGER  PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  course_id   INTEGER  NOT NULL REFERENCES courses (id) ON DELETE RESTRICT,
  entry_year  INTEGER  NOT NULL CHECK (entry_year BETWEEN 1900 AND 2100),
  status      TEXT     NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'locked', 'graduated', 'dropped'))
);
