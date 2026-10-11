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
