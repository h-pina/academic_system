import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const BACKUP_PATTERN = /^app-\d{8}-\d{6}\.sqlite$/;

/** `app-YYYYMMDD-HHMMSS.sqlite`, in UTC so names sort chronologically. */
export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `app-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}.sqlite`
  );
}

/**
 * Online backup of a live SQLite database (RNF06). It uses SQLite's backup
 * API, which is consistent even while the application writes; copying the
 * file would not be.
 */
export async function backupDatabase(
  source: string,
  directory: string,
  now: Date = new Date(),
): Promise<string> {
  mkdirSync(directory, { recursive: true });
  const target = join(directory, backupFileName(now));
  const db = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await db.backup(target);
  } finally {
    db.close();
  }
  return target;
}

/** Opens a backup read-only and runs SQLite's integrity check. */
export function verifyBackup(file: string): { ok: boolean; tables: number } {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const result = db.pragma('integrity_check', { simple: true });
    const tables = db
      .prepare(`SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table'`)
      .get() as { total: number };
    return { ok: result === 'ok', tables: tables.total };
  } finally {
    db.close();
  }
}

/** Keeps only the newest `keep` backups; returns the deleted file names. */
export function pruneBackups(directory: string, keep: number): string[] {
  if (!existsSync(directory)) return [];
  const files = readdirSync(directory).filter((name) => BACKUP_PATTERN.test(name)).sort();
  const stale = files.slice(0, Math.max(files.length - keep, 0));
  for (const name of stale) rmSync(join(directory, name));
  return stale;
}
