#!/usr/bin/env node
/**
 * Browser tests for the Academic System.
 *
 *   npm run test:e2e              flows, then visual regression
 *   npm run test:visual           only the screenshots
 *   npm run test:visual:update    rewrite the reference screenshots
 *
 * Needs a browser: set BROWSER_PATH, or have firefox/chromium/chrome on PATH.
 * Without one the suites are skipped with a warning (exit 0) unless
 * E2E_REQUIRE_BROWSER=1.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBrowser, launchBrowser } from './support/browser.mjs';
import { missingBuilds, startStack } from './support/stack.mjs';
import flows from './suites/flows.mjs';
import visual from './suites/visual.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

// Visual runs first, on a pristine database, so the data is always the seed.
const SUITES = [visual, flows];
const only = value('--only');
const selected = only ? SUITES.filter((suite) => suite.name === only) : SUITES;

if (selected.length === 0) {
  console.error(`Unknown suite "${only}". Available: ${SUITES.map((s) => s.name).join(', ')}`);
  process.exit(2);
}

const browserInfo = findBrowser();
if (!browserInfo) {
  const message =
    'No browser found. Set BROWSER_PATH to a Firefox or Chrome/Chromium executable.';
  if (process.env.E2E_REQUIRE_BROWSER === '1') {
    console.error(`ERROR: ${message}`);
    process.exit(1);
  }
  console.warn(`SKIPPED: ${message} (set E2E_REQUIRE_BROWSER=1 to make this an error)`);
  process.exit(0);
}

function build() {
  console.log('Building api and frontend...');
  const result = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (flag('--build') || missingBuilds().length > 0) build();

const options = {
  update: flag('--update'),
  maxDiffRatio: Number(process.env.E2E_MAX_DIFF ?? 0.0002),
  pixelThreshold: Number(process.env.E2E_PIXEL_THRESHOLD ?? 0.1),
};
const environment = `${browserInfo.product}-${process.platform}`;
const results = [];

console.log(`Browser: ${browserInfo.product} (${browserInfo.executablePath})`);
console.log(`Snapshot environment: ${environment}${options.update ? ' (updating references)' : ''}\n`);

let stack;
let browser;

const cleanup = async () => {
  await browser?.close().catch(() => {});
  await stack?.stop().catch(() => {});
};
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(130);
});

try {
  for (const suite of selected) {
    console.log(`== ${suite.name} ==`);
    stack = await startStack();
    browser = await launchBrowser(browserInfo);

    const record = (name, ok, detail = '') => {
      results.push({ suite: suite.name, name, ok });
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
    };

    try {
      await suite.run({ browser, record, options, environment });
    } catch (error) {
      record(`${suite.name} suite crashed`, false, String(error.stack ?? error).split('\n')[0]);
    }

    await browser.close().catch(() => {});
    await stack.stop();
    browser = undefined;
    stack = undefined;
    console.log('');
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  await cleanup();
  process.exit(1);
}

const failed = results.filter((result) => !result.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log('\nFailures:');
  for (const result of failed) console.log(`  [${result.suite}] ${result.name}`);
}
process.exit(failed.length > 0 ? 1 : 0);
