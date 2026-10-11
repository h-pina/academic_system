import { WEB_URL } from './stack.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Page helpers shared by the suites. They rely on labels and roles, not CSS classes. */
export async function openPage(browser, { width = 1280, height = 800, theme } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width, height });

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`PAGEERROR ${error.message}`));

  if (theme) {
    await page.evaluateOnNewDocument((value) => {
      try {
        localStorage.setItem('@academic:theme', value);
      } catch {
        /* storage unavailable */
      }
    }, theme);
  }
  return { context, page, consoleErrors };
}

export const goto = (page, path) =>
  page.goto(`${WEB_URL}${path}`, { waitUntil: 'networkidle0', timeout: 60000 });

export async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (needle) => document.body.innerText.toLowerCase().includes(needle.toLowerCase()),
    { timeout },
    text,
  );
}

export async function waitForTextGone(page, text, timeout = 15000) {
  await page.waitForFunction(
    (needle) => !document.body.innerText.toLowerCase().includes(needle.toLowerCase()),
    { timeout },
    text,
  );
}

export const bodyText = (page) => page.evaluate(() => document.body.innerText);

function setNativeValue(selector, value) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`element not found: ${selector}`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function clickButton(page, name, scope = 'body') {
  const clicked = await page.evaluate(
    (label, scopeSelector) => {
      const root = document.querySelector(scopeSelector) ?? document.body;
      const button = [...root.querySelectorAll('button')].find((b) => b.innerText.trim() === label);
      if (!button) return false;
      button.click();
      return true;
    },
    name,
    scope,
  );
  if (!clicked) throw new Error(`button not found: ${name}`);
}

export async function clickByLabel(page, ariaLabel) {
  const clicked = await page.evaluate((label) => {
    const element = document.querySelector(`[aria-label="${label}"]`);
    if (!element) return false;
    element.click();
    return true;
  }, ariaLabel);
  if (!clicked) throw new Error(`control not found: ${ariaLabel}`);
}

/** Fills a form control found by its visible label, inside the open dialog if any. */
export async function fillField(page, label, value) {
  const ok = await page.evaluate(
    (labelText, newValue) => {
      const scope = document.querySelector('[role="dialog"]') ?? document;
      const lab = [...scope.querySelectorAll('label')].find(
        (l) => l.innerText.replace('*', '').trim().toLowerCase() === labelText.toLowerCase(),
      );
      const element = lab && document.getElementById(lab.getAttribute('for'));
      if (!element) return false;

      let value = newValue;
      if (element.tagName === 'SELECT') {
        const option = [...element.options].find((o) => o.text.trim().startsWith(value));
        if (!option) return false;
        value = option.value;
      }
      const proto =
        element.tagName === 'SELECT'
          ? HTMLSelectElement.prototype
          : element.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
      element.dispatchEvent(
        new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
      );
      return true;
    },
    label,
    value,
  );
  if (!ok) throw new Error(`field not found: ${label}`);
}

/** Moves focus out of a field, as a person would, to run its blur checks. */
export async function blurField(page, label) {
  await page.evaluate((labelText) => {
    const scope = document.querySelector('[role="dialog"]') ?? document;
    const lab = [...scope.querySelectorAll('label')].find(
      (l) => l.innerText.replace('*', '').trim().toLowerCase() === labelText.toLowerCase(),
    );
    const element = lab && document.getElementById(lab.getAttribute('for'));
    element?.focus();
    element?.blur();
  }, label);
}

export async function login(page, identifier, password = 'password123') {
  await goto(page, '/login');
  await page.waitForSelector('input[inputmode="numeric"]');
  await page.evaluate(setNativeValue, 'input[inputmode="numeric"]', identifier);
  await clickButton(page, 'Continuar');
  await page.waitForSelector('input[type="password"]');
  await page.evaluate(setNativeValue, 'input[type="password"]', password);
  await clickButton(page, 'Entrar');
  await page.waitForFunction(() => location.pathname === '/app', { timeout: 20000 });
}

export async function menuSections(page) {
  await page.waitForSelector('aside nav a, nav[aria-label="Módulos"] a');
  return page.evaluate(() => {
    const nav = document.querySelector('aside nav[aria-label="Módulos"]') ??
      document.querySelector('nav[aria-label="Módulos"]');
    return [...nav.children]
      .map((group) => ({
        title: group.querySelector('p')?.innerText.trim().toLowerCase() ?? null,
        items: [...group.querySelectorAll('a')].map((a) => a.innerText.trim()),
      }))
      .filter((group) => group.items.length > 0);
  });
}
