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

-- ---------------------------------------------------------------------------
-- Semester operations (calendar, classes, enrollment, grades, attendance,
-- activities, news) and the audit trail. Dumped from the schema TypeORM
-- creates, so it matches the entities exactly.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "institution_settings" ("key" varchar(60) PRIMARY KEY NOT NULL, "value" varchar(200) NOT NULL);

CREATE TABLE IF NOT EXISTS "audit_log" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "actor_id" integer, "action" varchar(60) NOT NULL, "entity" varchar(60) NOT NULL, "entity_id" integer, "at" varchar(30) NOT NULL, "details" text);

CREATE INDEX IF NOT EXISTS "IDX_audit_log_entity" ON "audit_log" ("entity", "entity_id") ;

CREATE TABLE IF NOT EXISTS "academic_calendars" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "description" varchar(120) NOT NULL, "start_date" varchar(10) NOT NULL, "end_date" varchar(10) NOT NULL, "enrollment_start" varchar(10) NOT NULL, "enrollment_end" varchar(10) NOT NULL, "withdrawal_deadline" varchar(10) NOT NULL, "grades_deadline" varchar(10) NOT NULL, CONSTRAINT "CHK_academic_calendars_enrollment" CHECK ("enrollment_start" <= "enrollment_end"), CONSTRAINT "CHK_academic_calendars_period" CHECK ("start_date" < "end_date"));

CREATE TABLE IF NOT EXISTS "semesters" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "calendar_id" integer NOT NULL, "year" integer NOT NULL, "term" integer NOT NULL, "start_date" varchar(10) NOT NULL, "end_date" varchar(10) NOT NULL, "status" varchar(20) NOT NULL DEFAULT ('draft'), CONSTRAINT "UQ_semesters_year_term" UNIQUE ("year", "term"), CONSTRAINT "CHK_semesters_period" CHECK ("start_date" < "end_date"), CONSTRAINT "CHK_semesters_status" CHECK ("status" IN ('draft', 'active', 'closed')), CONSTRAINT "CHK_semesters_term" CHECK ("term" IN (1, 2)), CONSTRAINT "FK_5cbded9d52ba566ab846485dd27" FOREIGN KEY ("calendar_id") REFERENCES "academic_calendars" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION);

CREATE TABLE IF NOT EXISTS "class_groups" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "semester_id" integer NOT NULL, "subject_id" integer NOT NULL, "teacher_id" integer, "code" varchar(20) NOT NULL, "seats" integer NOT NULL, "status" varchar(20) NOT NULL DEFAULT ('pending'), "requested_by" integer, "approved_by" integer, "approved_at" varchar(30), "rejection_reason" varchar(300), CONSTRAINT "UQ_class_groups_code" UNIQUE ("semester_id", "subject_id", "code"), CONSTRAINT "CHK_class_groups_status" CHECK ("status" IN ('pending', 'approved', 'rejected', 'closed')), CONSTRAINT "CHK_class_groups_seats" CHECK ("seats" >= 1), CONSTRAINT "FK_4730e94c12c508ade9f03032e60" FOREIGN KEY ("semester_id") REFERENCES "semesters" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_383436913317a032e473fd9852b" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_2a447f02957de111e3caa800441" FOREIGN KEY ("teacher_id") REFERENCES "teachers" ("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION);

CREATE TABLE IF NOT EXISTS "class_schedules" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "class_id" integer NOT NULL, "weekday" integer NOT NULL, "start_time" varchar(5) NOT NULL, "end_time" varchar(5) NOT NULL, "room" varchar(40), CONSTRAINT "CHK_class_schedules_time" CHECK ("start_time" < "end_time"), CONSTRAINT "CHK_class_schedules_weekday" CHECK ("weekday" BETWEEN 1 AND 7), CONSTRAINT "FK_8311cc83d9350de70f2a77e8c5e" FOREIGN KEY ("class_id") REFERENCES "class_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);

CREATE INDEX IF NOT EXISTS "IDX_class_schedules_class" ON "class_schedules" ("class_id") ;

CREATE TABLE IF NOT EXISTS "enrollments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "student_id" integer NOT NULL, "class_id" integer NOT NULL, "status" varchar(20) NOT NULL DEFAULT ('confirmed'), "requested_at" varchar(30) NOT NULL, "confirmed_at" varchar(30), "final_grade" real, CONSTRAINT "UQ_enrollments_student_class" UNIQUE ("student_id", "class_id"), CONSTRAINT "CHK_enrollments_status" CHECK ("status" IN ('confirmed', 'cancelled', 'locked', 'approved', 'failed_grade', 'failed_attendance')), CONSTRAINT "FK_307813fe255896d6ebf3e6cd55c" FOREIGN KEY ("student_id") REFERENCES "students" ("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_f8b7b5b30f3d3c3c8b81068cd79" FOREIGN KEY ("class_id") REFERENCES "class_groups" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION);

CREATE INDEX IF NOT EXISTS "IDX_enrollments_class" ON "enrollments" ("class_id") ;

CREATE INDEX IF NOT EXISTS "IDX_enrollments_student" ON "enrollments" ("student_id") ;

CREATE TABLE IF NOT EXISTS "assessments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "class_id" integer NOT NULL, "name" varchar(80) NOT NULL, "weight" real NOT NULL, "max_score" real NOT NULL DEFAULT (10), CONSTRAINT "CHK_assessments_max_score" CHECK ("max_score" > 0), CONSTRAINT "CHK_assessments_weight" CHECK ("weight" > 0), CONSTRAINT "FK_34452fc8e5440f1fbbb077e4c56" FOREIGN KEY ("class_id") REFERENCES "class_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);

CREATE INDEX IF NOT EXISTS "IDX_assessments_class" ON "assessments" ("class_id") ;

CREATE TABLE IF NOT EXISTS "grades" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "enrollment_id" integer NOT NULL, "assessment_id" integer NOT NULL, "value" real NOT NULL, "posted_by" integer NOT NULL, "posted_at" varchar(30) NOT NULL, CONSTRAINT "UQ_grades_enrollment_assessment" UNIQUE ("enrollment_id", "assessment_id"), CONSTRAINT "CHK_grades_value" CHECK ("value" >= 0), CONSTRAINT "FK_ce4136a5756d2fe2ee20fe01a3d" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_01a840e819595a73786b234f4ee" FOREIGN KEY ("assessment_id") REFERENCES "assessments" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);

CREATE INDEX IF NOT EXISTS "IDX_grades_enrollment" ON "grades" ("enrollment_id") ;

CREATE TABLE IF NOT EXISTS "grade_reopenings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "class_id" integer NOT NULL, "justification" varchar(500) NOT NULL, "status" varchar(20) NOT NULL DEFAULT ('pending'), "requested_by" integer NOT NULL, "decided_by" integer, "open_until" varchar(10), CONSTRAINT "CHK_grade_reopenings_status" CHECK ("status" IN ('pending', 'approved', 'rejected')), CONSTRAINT "FK_fd3a79afb7f5bf335356a9ddc4f" FOREIGN KEY ("class_id") REFERENCES "class_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);

CREATE TABLE IF NOT EXISTS "attendance_records" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "class_id" integer NOT NULL, "enrollment_id" integer NOT NULL, "lesson_date" varchar(10) NOT NULL, "present" boolean NOT NULL, "recorded_by" integer NOT NULL, CONSTRAINT "UQ_attendance_enrollment_date" UNIQUE ("enrollment_id", "lesson_date"), CONSTRAINT "FK_cc48ccbd03396874857ab06ac3b" FOREIGN KEY ("class_id") REFERENCES "class_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_ac1298d6bec15b271f734c4e5d6" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);

CREATE INDEX IF NOT EXISTS "IDX_attendance_class_date" ON "attendance_records" ("class_id", "lesson_date") ;

CREATE TABLE IF NOT EXISTS "activities" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "class_id" integer NOT NULL, "title" varchar(120) NOT NULL, "description" varchar(2000) NOT NULL, "due_at" varchar(30) NOT NULL, "allow_late_until" varchar(30), "created_by" integer NOT NULL, "created_at" varchar(30) NOT NULL, CONSTRAINT "FK_a361051322d90444cb49fa8c3f9" FOREIGN KEY ("class_id") REFERENCES "class_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);

CREATE INDEX IF NOT EXISTS "IDX_activities_class" ON "activities" ("class_id") ;

CREATE TABLE IF NOT EXISTS "submissions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "activity_id" integer NOT NULL, "student_id" integer NOT NULL, "answer_text" varchar(5000), "file_name" varchar(160), "file_path" varchar(240), "submitted_at" varchar(30) NOT NULL, "late" boolean NOT NULL DEFAULT (0), CONSTRAINT "UQ_submissions_activity_student" UNIQUE ("activity_id", "student_id"), CONSTRAINT "FK_b34d768d48b746df290aabcfe99" FOREIGN KEY ("activity_id") REFERENCES "activities" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_435def3bbd4b4bbb9de1209cdae" FOREIGN KEY ("student_id") REFERENCES "students" ("user_id") ON DELETE CASCADE ON UPDATE NO ACTION);

CREATE INDEX IF NOT EXISTS "IDX_submissions_student" ON "submissions" ("student_id") ;

CREATE TABLE IF NOT EXISTS "news_posts" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "author_id" integer NOT NULL, "class_id" integer, "title" varchar(120) NOT NULL, "body" varchar(4000) NOT NULL, "published_at" varchar(30) NOT NULL, "updated_at" varchar(30) NOT NULL, CONSTRAINT "FK_c5e21a576907051a693e3eb0d28" FOREIGN KEY ("class_id") REFERENCES "class_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);

CREATE INDEX IF NOT EXISTS "IDX_news_posts_class" ON "news_posts" ("class_id") ;
