import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import puppeteer from 'puppeteer-core';

const CANDIDATES = [
  'firefox',
  'chromium',
  'chromium-browser',
  'google-chrome',
  'google-chrome-stable',
];

function which(command) {
  try {
    const out = execFileSync('which', [command], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

/**
 * Finds a browser to drive: `BROWSER_PATH` first, then well-known names on
 * the PATH. Returns `null` when none is available.
 */
export function findBrowser() {
  const fromEnv = process.env.BROWSER_PATH;
  if (fromEnv) {
    return existsSync(fromEnv) ? describe(fromEnv) : null;
  }
  for (const candidate of CANDIDATES) {
    const found = which(candidate);
    if (found) return describe(found);
  }
  return null;
}

function describe(executablePath) {
  const name = basename(executablePath).toLowerCase();
  const product = name.includes('firefox') ? 'firefox' : 'chrome';
  return { executablePath, product };
}

/** Launches the browser headless. Firefox is driven through WebDriver BiDi. */
export function launchBrowser(browser) {
  return puppeteer.launch({
    browser: browser.product,
    executablePath: browser.executablePath,
    headless: true,
    ...(browser.product === 'firefox' ? { protocol: 'webDriverBiDi' } : {}),
    defaultViewport: null,
  });
}
