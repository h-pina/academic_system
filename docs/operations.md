# Operations: availability, backup and disaster recovery

Covers RNF01 (availability) and RNF06 (backup and disaster recovery) of the specification.

## Health check (RNF01)

`GET /health` is public and returns `{ status: "ok", database: "up", uptimeSeconds }`, or `503` when the database
does not answer. Point the uptime monitor and the load balancer at it. The 99.5 % target on business days is an
infrastructure goal: it needs a process supervisor (systemd, PM2 or a container restart policy), a monitor on
`/health`, and maintenance windows outside the enrollment periods defined in the academic calendar. The code cannot
prove it by itself.

## Backup (RNF06)

The database is a single SQLite file (`DATABASE_PATH`, default `api/data/app.sqlite`). Never copy it while the API
runs: use the script, which relies on SQLite's online backup API and verifies the copy.

```bash
npm run backup --workspace api
```

| Variable | Default | Meaning |
|----------|---------|---------|
| `DATABASE_PATH` | `data/app.sqlite` | Database to back up |
| `BACKUP_DIR` | `data/backups` | Where `app-YYYYMMDD-HHMMSS.sqlite` files go |
| `BACKUP_KEEP` | `14` | How many backups to keep (older ones are removed) |

The script exits non-zero when the backup fails or the copy does not pass `PRAGMA integrity_check`, so a scheduler
can alert on it. Uploaded submission files live in `UPLOAD_DIR` (default `api/data/uploads`) and must be backed up
with the same schedule (for example `rsync` to the backup host).

Suggested schedule (cron, every night at 02:00, plus once before each enrollment window opens):

```cron
0 2 * * * cd /srv/academic-system && npm run backup --workspace api >> /var/log/academic-backup.log 2>&1
```

Copy `BACKUP_DIR` off the machine (another host or object storage). A backup on the same disk is not a disaster
recovery plan.

## Disaster recovery

Recovery point objective: the age of the latest backup (at most 24 h with the nightly schedule). Recovery time
objective: about 15 minutes.

1. Stop the API.
2. Pick the newest backup that passes verification.
3. Restore it (the previous database is kept as `app.sqlite.before-restore`):
   ```bash
   npm run restore --workspace api -- data/backups/app-YYYYMMDD-HHMMSS.sqlite
   ```
4. Restore the uploads directory from its backup.
5. Start the API and check `GET /health` and a login.
6. Record the incident in the audit trail of your operations log.

Test the restore at least once per semester on a copy of production, not only the backup.

## Time travel is development only

`PUT /clock` moves the server's clock and, because any signed-in user may call it, would let anyone bypass every deadline. It is **off when
`NODE_ENV=production`**. Leave `TIME_TRAVEL` unset there (setting it to `true` re-enables it), and check that
`GET /clock` answers `canTravel: false` after a deployment.
