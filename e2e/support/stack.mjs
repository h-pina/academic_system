import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const API_PORT = 3001; // the web build points at this port
export const WEB_PORT = 3005;
export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

async function waitUntilUp(url, label, child, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${label} exited early with code ${child.exitCode}`);
    }
    if (await isUp(url)) return;
    await sleep(300);
  }
  throw new Error(`${label} did not answer at ${url} within ${timeoutMs / 1000}s`);
}

/** The builds the stack needs; reports what is missing. */
export function missingBuilds() {
  const missing = [];
  if (!existsSync(join(ROOT, 'api/dist/main.js'))) missing.push('api (npm run build --workspace api)');
  if (!existsSync(join(ROOT, 'frontend/.next/BUILD_ID'))) {
    missing.push('frontend (npm run build --workspace frontend)');
  }
  return missing;
}

/**
 * Starts the API on a throwaway SQLite database seeded with the sample data,
 * and the built frontend, and returns a function that stops both.
 */
export async function startStack() {
  for (const [label, url] of [
    ['API port', `${API_URL}/auth/access/12345678909`],
    ['web port', `${WEB_URL}/login`],
  ]) {
    if (await isUp(url)) {
      throw new Error(
        `${label} is already in use (${url}). Stop the dev servers on ports ${API_PORT} and ${WEB_PORT} first.`,
      );
    }
  }

  const dir = mkdtempSync(join(tmpdir(), 'academic-e2e-'));
  const children = [];

  const api = spawn('node', ['dist/main.js'], {
    cwd: join(ROOT, 'api'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(API_PORT),
      DATABASE_PATH: join(dir, 'e2e.sqlite'),
      JWT_SECRET: 'e2e-secret',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_SALT_ROUNDS: '4',
      SEED_ON_STARTUP: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(api);

  const web = spawn(
    'node',
    [join(ROOT, 'node_modules/next/dist/bin/next'), 'start', '-p', String(WEB_PORT)],
    { cwd: join(ROOT, 'frontend'), stdio: ['ignore', 'pipe', 'pipe'] },
  );
  children.push(web);

  const logs = { api: '', web: '' };
  api.stdout.on('data', (chunk) => (logs.api += chunk));
  api.stderr.on('data', (chunk) => (logs.api += chunk));
  web.stdout.on('data', (chunk) => (logs.web += chunk));
  web.stderr.on('data', (chunk) => (logs.web += chunk));

  const stop = async () => {
    for (const child of children) {
      if (child.exitCode === null) child.kill('SIGTERM');
    }
    await sleep(300);
    for (const child of children) {
      if (child.exitCode === null) child.kill('SIGKILL');
    }
    rmSync(dir, { recursive: true, force: true });
  };

  try {
    await waitUntilUp(`${API_URL}/auth/access/12345678909`, 'API', api);
    await waitUntilUp(`${WEB_URL}/login`, 'web app', web);
  } catch (error) {
    await stop();
    throw new Error(`${error.message}\n--- api log ---\n${logs.api}\n--- web log ---\n${logs.web}`);
  }

  return { stop, logs };
}
