import { copyFileSync, existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyBackup } from '../common/database/backup';

/**
 * `npm run restore --workspace api -- <backup-file>`: verifies a backup and
 * puts it in place of the live database, keeping the previous one aside.
 * Stop the API before running it.
 */
function main(): void {
  const backup = process.argv[2];
  if (!backup) throw new Error('usage: restore <backup-file>');
  const source = resolve(backup);
  const target = resolve(process.env.DATABASE_PATH ?? 'data/app.sqlite');

  if (!verifyBackup(source).ok) throw new Error(`${source} failed the integrity check`);
  if (existsSync(target)) renameSync(target, `${target}.before-restore`);
  copyFileSync(source, target);
  console.log(`restored ${source} -> ${target}`);
}

try {
  main();
} catch (error) {
  console.error(`restore failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
