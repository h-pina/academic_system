import Database from 'better-sqlite3';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { backupDatabase, backupFileName, pruneBackups, verifyBackup } from './backup';

describe('database backup (RNF06)', () => {
  let dir: string;
  let source: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'academic-backup-'));
    source = join(dir, 'live.sqlite');
    const db = new Database(source);
    db.exec(`CREATE TABLE grades (id INTEGER PRIMARY KEY, value REAL); INSERT INTO grades (value) VALUES (7.5), (9);`);
    db.close();
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('names backups chronologically', () => {
    expect(backupFileName(new Date('2026-03-02T04:05:06Z'))).toBe('app-20260302-040506.sqlite');
  });

  it('creates a consistent copy that restores the same data', async () => {
    const file = await backupDatabase(source, join(dir, 'backups'), new Date('2026-03-02T04:05:06Z'));
    expect(verifyBackup(file)).toEqual({ ok: true, tables: 1 });
    const copy = new Database(file, { readonly: true });
    expect(copy.prepare('SELECT SUM(value) AS total FROM grades').get()).toEqual({ total: 16.5 });
    copy.close();
  });

  it('copes with writes made after the backup (the copy is a snapshot)', async () => {
    const file = await backupDatabase(source, join(dir, 'backups'), new Date('2026-03-03T00:00:00Z'));
    const live = new Database(source);
    live.exec('INSERT INTO grades (value) VALUES (1)');
    live.close();
    const copy = new Database(file, { readonly: true });
    expect(copy.prepare('SELECT COUNT(*) AS n FROM grades').get()).toEqual({ n: 2 });
    copy.close();
  });

  it('fails clearly when the source database does not exist', async () => {
    await expect(backupDatabase(join(dir, 'missing.sqlite'), join(dir, 'backups'))).rejects.toThrow();
  });

  it('detects a corrupted backup', () => {
    const broken = join(dir, 'broken.sqlite');
    writeFileSync(broken, 'this is not a sqlite database at all, just text'.repeat(50));
    expect(() => verifyBackup(broken)).toThrow();
  });

  it('keeps only the newest backups and ignores other files', async () => {
    const backups = join(dir, 'backups');
    writeFileSync(join(backups, 'notes.txt'), 'keep me');
    await backupDatabase(source, backups, new Date('2026-03-04T00:00:00Z'));
    const removed = pruneBackups(backups, 2);
    expect(removed).toEqual(['app-20260302-040506.sqlite']);
    expect(readdirSync(backups).sort()).toEqual([
      'app-20260303-000000.sqlite',
      'app-20260304-000000.sqlite',
      'notes.txt',
    ]);
    expect(pruneBackups(join(dir, 'nowhere'), 2)).toEqual([]);
  });
});
