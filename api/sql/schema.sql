-- Reference schema (SQLite dialect).
--
-- With `synchronize: true` (the default outside production - see
-- src/app.module.ts) TypeORM creates and migrates these tables
-- automatically from the entity classes under
-- src/features/**/entities/*.entity.ts. This file is kept purely as
-- documentation of the resulting shape.

-- Translated from the original Portuguese "Usuario" table.
CREATE TABLE IF NOT EXISTS users (
  cpf            TEXT     PRIMARY KEY,        -- was codUsuarioCPF (CHAR(11))
  name           TEXT     NOT NULL,           -- was nomUsuario
  email          TEXT     NOT NULL UNIQUE,    -- was desEmail
  role_id        INTEGER  NOT NULL,           -- was idPapel
  password_hash  TEXT                         -- was desSenha (bcrypt hash, nullable
                                              --   until the user sets a password)
);

-- Translated from the original Portuguese "Cargo" table.
CREATE TABLE IF NOT EXISTS positions (
  id    INTEGER  PRIMARY KEY AUTOINCREMENT,   -- was codCargo
  name  TEXT     NOT NULL                     -- was nomCargo
);

-- Requisição de Material (RM) - CDU01 "Gerar RM".
CREATE TABLE IF NOT EXISTS material_requisitions (
  id                     INTEGER  PRIMARY KEY AUTOINCREMENT,  -- the RM identifier number (P07)
  requester_cpf          TEXT     NOT NULL,                   -- solicitante, from the JWT
  requester_name         TEXT     NOT NULL,                   -- name snapshot shown on P02
  created_at             TEXT     NOT NULL,                   -- "data atual" (YYYY-MM-DD)
  status                 TEXT     NOT NULL DEFAULT 'AWAITING_APPROVAL',
                                              --   AWAITING_APPROVAL | AWAITING_CHANGES
                                              --   | APPROVED | CANCELLED
  priority_requested     INTEGER  NOT NULL DEFAULT 0,         -- A01 flag (boolean)
  priority_justification TEXT,                                -- RN02: set when priority_requested
  reviewer_note          TEXT                                 -- A02: chief's "parecer de alteração"
);

-- One line of an RM (1..10 per RM - RN01).
CREATE TABLE IF NOT EXISTS material_requisition_items (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  requisition_id INTEGER  NOT NULL,                           -- material_requisitions.id
  description    TEXT     NOT NULL,
  quantity       INTEGER  NOT NULL
);
