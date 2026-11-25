import { resolve } from 'node:path';
import { backupDatabase, pruneBackups, verifyBackup } from '../common/database/backup';

/**
 * `npm run backup --workspace api`: backs up the database, verifies the copy
 * and prunes old ones. Meant to be run by cron/systemd (see docs/operations.md).
 */
async function main(): Promise<void> {
  const source = resolve(process.env.DATABASE_PATH ?? 'data/app.sqlite');
  const directory = resolve(process.env.BACKUP_DIR ?? 'data/backups');
  const keep = Number(process.env.BACKUP_KEEP ?? 14);

  const file = await backupDatabase(source, directory);
  const check = verifyBackup(file);
  if (!check.ok) {
    throw new Error(`backup ${file} failed the integrity check`);
  }
  const removed = pruneBackups(directory, keep);
  console.log(`backup ok: ${file} (${check.tables} tables); pruned ${removed.length}`);
}

main().catch((error) => {
  console.error(`backup failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
