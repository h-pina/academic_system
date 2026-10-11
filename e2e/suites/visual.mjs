import { goto, login, openPage, sleep, waitForText } from '../support/page.mjs';
import { compareSnapshot } from '../support/snapshot.mjs';

const ADMIN = '12345678909';
const TEACHER = '11122233396';
const STUDENT = '2026000001';

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

/**
 * The screens that define the look of the application, each in light and
 * dark. Every case waits for a piece of text that proves the data is there.
 */
const CASES = [
  { name: 'login', user: null, path: '/login', ready: 'Entre para continuar', viewport: DESKTOP },
  { name: 'admin-home', user: ADMIN, path: '/app', ready: 'Visão geral da instituição', viewport: DESKTOP },
  { name: 'students', user: ADMIN, path: '/app/students', ready: 'Liam Graduated', viewport: DESKTOP },
  { name: 'curriculum', user: ADMIN, path: '/app/courses/1/curriculum', ready: 'Matriz curricular', viewport: DESKTOP },
  { name: 'teacher-department', user: TEACHER, path: '/app/my-department', ready: 'Heidi Both', viewport: DESKTOP },
  { name: 'student-course-phone', user: STUDENT, path: '/app/my-course', ready: 'Carga horária', viewport: PHONE },
  { name: 'student-home-phone', user: STUDENT, path: '/app', ready: 'Meu curso', viewport: PHONE },
];

/** Removes everything that varies between runs: motion, carets, scrollbars. */
const FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  ::-webkit-scrollbar { display: none; }
  html { scrollbar-width: none; }
`;

async function capture(ctx, testCase, theme) {
  const opened = await openPage(ctx.browser, { ...testCase.viewport, theme });
  const { page, context } = opened;
  try {
    if (testCase.user) await login(page, testCase.user);
    await goto(page, testCase.path);
    await waitForText(page, testCase.ready);
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.evaluate(() => document.fonts.ready);
    await sleep(500);
    return await page.screenshot({ type: 'png' });
  } finally {
    await context.close().catch(() => {});
  }
}

export default {
  name: 'visual',
  async run(ctx) {
    for (const testCase of CASES) {
      for (const theme of ['light', 'dark']) {
        const name = `${testCase.name}-${theme}`;
        try {
          const png = await capture(ctx, testCase, theme);
          const result = compareSnapshot({
            name,
            environment: ctx.environment,
            png: Buffer.from(png),
            update: ctx.options.update,
            maxDiffRatio: ctx.options.maxDiffRatio,
            pixelThreshold: ctx.options.pixelThreshold,
          });
          ctx.record(`screenshot ${name}`, result.ok, result.note);
        } catch (error) {
          ctx.record(`screenshot ${name}`, false, String(error.message).split('\n')[0]);
        }
      }
    }
  },
};
