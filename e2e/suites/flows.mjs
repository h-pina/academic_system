import {
  blurField,
  bodyText,
  clickButton,
  clickByLabel,
  fillField,
  goto,
  login,
  menuSections,
  openPage,
  sleep,
  waitForText,
  waitForTextGone,
} from '../support/page.mjs';
import { API_URL, WEB_URL } from '../support/stack.mjs';

const ADMIN = '12345678909';
const SECRETARY = '98765432100';
const TEACHER = '11122233396';
const STUDENT_BY_MATRICULA = '2026000001';
const NO_PROFILE = '88899911193';

/** Console noise that is expected: API errors the flows provoke, and aborted prefetches. */
const EXPECTED_CONSOLE = /status of (400|401|403|404|409)|Failed to load resource|the server responded|Failed to fetch RSC payload/i;

async function submitDialog(page, label) {
  await clickButton(page, label, '[role="dialog"]');
}

async function session(ctx, identifier, options) {
  const opened = await openPage(ctx.browser, options);
  ctx.sessions.push(opened);
  if (identifier) await login(opened.page, identifier);
  return opened;
}

const FLOWS = [
  {
    name: 'sign-in and sign-out',
    run: async (ctx, check) => {
      const { page } = await session(ctx, null);
      await login(page, '123.456.789-09'); // formatted CPF
      await waitForText(page, 'Bem-vindo, Alice Admin');
      check('signs in with a formatted CPF', new URL(page.url()).pathname === '/app');

      const titles = (await menuSections(page)).map((section) => section.title);
      check(
        'admin menu is grouped by purpose',
        titles.join('|') === 'pessoas|estrutura acadêmica|operação acadêmica|administração|conta',
        titles.join('|'),
      );

      await page.click('button[aria-label^="Menu de"]');
      await page.waitForSelector('[role="menu"]');
      await page.evaluate(() =>
        [...document.querySelectorAll('[role="menuitem"]')]
          .find((item) => /Sair/.test(item.innerText))
          .click(),
      );
      await page.waitForFunction(() => location.pathname === '/login', { timeout: 10000 });
      check('signs out from the user menu', true);
    },
  },
  {
    name: 'wrong password',
    run: async (ctx, check) => {
      const { page } = await session(ctx, null);
      await goto(page, '/login');
      await page.waitForSelector('input[inputmode="numeric"]');
      await fillLogin(page, ADMIN, 'senha-errada');
      await waitForText(page, 'CPF, matrícula ou senha inválidos');
      check('shows the Portuguese credentials error', true);
      check('stays on the login page', new URL(page.url()).pathname === '/login');
    },
  },
  {
    name: 'access by profile',
    run: async (ctx, check) => {
      // Student, signing in with the matrícula.
      const student = await session(ctx, STUDENT_BY_MATRICULA);
      await waitForText(student.page, 'Meu curso');
      const items = (await menuSections(student.page)).flatMap((s) => s.items);
      check(
        'student sees only their own path',
        items.join('|') === 'Painel acadêmico|Inscrição em turmas|Avisos|Calendário acadêmico|Meu curso|Meus dados',
        items.join('|'),
      );
      for (const route of ['students', 'staff', 'courses']) {
        await goto(student.page, `/app/${route}`);
        await student.page.waitForFunction(() => location.pathname === '/app', { timeout: 10000 });
        check(`student is redirected away from /app/${route}`, true);
      }

      // Teacher.
      const teacher = await session(ctx, TEACHER);
      await waitForText(teacher.page, 'Meu departamento');
      const teacherItems = (await menuSections(teacher.page)).flatMap((s) => s.items);
      check(
        'teacher sees department and catalogue',
        teacherItems.join('|') === 'Turmas|Avisos|Calendário acadêmico|Meu departamento|Alunos|Cursos e matrizes|Disciplinas|Meus dados',
        teacherItems.join('|'),
      );

      // Person without a profile.
      const orphan = await session(ctx, NO_PROFILE);
      await waitForText(orphan.page, 'Cadastro sem vínculo');
      check('user without profile sees the notice', true);
      await goto(orphan.page, '/app/profile');
      await waitForText(orphan.page, 'Meus dados');
      check('user without profile can still open their own data', true);
      await goto(orphan.page, '/app/students');
      await waitForText(orphan.page, 'Cadastro sem vínculo');
      check('and nothing else', true);
    },
  },
  {
    name: 'students',
    run: async (ctx, check) => {
      const { page } = await session(ctx, SECRETARY);
      await goto(page, '/app/students');
      await waitForText(page, 'Erin Student');

      await clickButton(page, 'Novo aluno');
      await page.waitForSelector('[role="dialog"]');
      await fillField(page, 'CPF', '39053344705');
      await blurField(page, 'CPF');
      await sleep(300);
      await fillField(page, 'Nome', 'Zelda Navegador');
      await fillField(page, 'E-mail', 'zelda.navegador@example.com');
      await fillField(page, 'Curso', 'Computer Science');
      await submitDialog(page, 'Cadastrar');
      await waitForText(page, 'Aluno cadastrado.');
      check('creates a student', true);

      await page.evaluate(() => {
        const input = document.querySelector('input[type="search"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Zelda');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await waitForText(page, 'Zelda Navegador');
      await waitForTextGone(page, 'Erin Student');
      const row = await page.evaluate(
        () => [...document.querySelectorAll('tbody tr')].map((r) => r.innerText.replace(/\s+/g, ' ')).join('|'),
      );
      check('search narrows the list and the new student has a matrícula', /\b2026\d{6}\b/.test(row), row.slice(0, 90));

      await clickButton(page, 'Novo aluno');
      await page.waitForSelector('[role="dialog"]');
      await fillField(page, 'CPF', '39053344705');
      await fillField(page, 'Nome', 'Zelda Navegador');
      await fillField(page, 'E-mail', 'zelda.navegador@example.com');
      await fillField(page, 'Curso', 'Computer Science');
      await submitDialog(page, 'Cadastrar');
      await waitForText(page, 'Esta pessoa já possui vínculo de aluno');
      check('a duplicate shows the Portuguese API error', true);
      await page.keyboard.press('Escape');

      await clickByLabel(page, 'Editar Zelda Navegador');
      await page.waitForSelector('[role="dialog"]');
      await fillField(page, 'Situação', 'Trancado');
      await submitDialog(page, 'Salvar alterações');
      await waitForText(page, 'Aluno atualizado.');
      await waitForText(page, 'Trancado');
      check('edits the status', true);

      await page.evaluate(() => {
        const input = document.querySelector('input[type="search"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'zzzz-sem-resultado');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await waitForText(page, 'Nenhum aluno encontrado');
      check('an empty search explains what to do', /Limpe a busca/.test(await bodyText(page)));
    },
  },
  {
    name: 'academic structure',
    run: async (ctx, check) => {
      const { page } = await session(ctx, ADMIN);

      // A department with courses cannot be deleted.
      await goto(page, '/app/departments');
      await waitForText(page, 'Computer Science');
      await clickByLabel(page, 'Excluir Computer Science');
      await page.waitForSelector('[role="dialog"]');
      await submitDialog(page, 'Excluir');
      await waitForText(page, 'ainda tem');
      check('a department with courses cannot be deleted, with the reason', true);

      // A server-side validation error lands on the field.
      await goto(page, '/app/courses');
      await waitForText(page, 'Computer Science');
      await clickButton(page, 'Novo curso');
      await page.waitForSelector('[role="dialog"]');
      await fillField(page, 'Nome', 'N'.repeat(130));
      await fillField(page, 'Código', 'LONG1');
      await fillField(page, 'Departamento', 'Computer');
      await fillField(page, 'Número de semestres', '6');
      await submitDialog(page, 'Cadastrar');
      await waitForText(page, 'longo demais');
      const field = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const label = [...dialog.querySelectorAll('label')].find((l) => l.innerText.replace('*', '').trim() === 'Nome');
        const input = document.getElementById(label.getAttribute('for'));
        return { invalid: input.getAttribute('aria-invalid'), focused: document.activeElement === input };
      });
      check('the API error is shown on the field and the field is focused', field.invalid === 'true' && field.focused, JSON.stringify(field));
      await page.keyboard.press('Escape');

      // A prerequisite cycle is explained.
      await goto(page, '/app/subjects');
      await waitForText(page, 'Calculus I');
      await clickByLabel(page, 'Editar Calculus I');
      await page.waitForSelector('[role="dialog"]');
      await waitForText(page, 'MAT102');
      await page.evaluate(() => {
        const label = [...document.querySelectorAll('[role="dialog"] label')].find((l) => l.innerText.includes('MAT102'));
        label.querySelector('input[type="checkbox"]').click();
      });
      await submitDialog(page, 'Salvar alterações');
      await waitForText(page, 'ciclo de dependência');
      check('a prerequisite cycle is rejected with the reason', true);
      await page.keyboard.press('Escape');

      // Curriculum: add and remove a subject.
      await goto(page, '/app/courses');
      await page.waitForSelector('a[aria-label^="Ver a matriz curricular de Mathematics"]');
      await page.click('a[aria-label^="Ver a matriz curricular de Mathematics"]');
      await waitForText(page, 'Matriz curricular — Mathematics');
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].filter((b) => /Adicionar disciplina/.test(b.innerText))[4].click(),
      );
      await page.waitForSelector('[role="dialog"]');
      await waitForText(page, 'CC102');
      await page.evaluate(() =>
        [...document.querySelectorAll('[role="dialog"] li button')].find((b) => /CC102/.test(b.innerText)).click(),
      );
      await waitForText(page, 'Disciplina adicionada à matriz.');
      await page.keyboard.press('Escape');
      await sleep(300);
      await clickByLabel(page, 'Remover Data Structures da matriz');
      await page.waitForSelector('[role="dialog"]');
      await submitDialog(page, 'Remover');
      await waitForText(page, 'Disciplina removida da matriz.');
      check('adds and removes a subject in the curriculum', true);
    },
  },
  {
    name: 'lists keep their state in the URL',
    run: async (ctx, check) => {
      const { page } = await session(ctx, ADMIN);
      await goto(page, '/app/students');
      await waitForText(page, 'Erin Student');

      await page.evaluate(() => {
        const header = [...document.querySelectorAll('th button')].find((b) => /Ingresso/i.test(b.innerText));
        header.click();
      });
      await sleep(700);
      check('sorting by a header is reflected in the URL', /sort=entryYear/.test(await page.evaluate(() => location.search)));
      const aria = await page.evaluate(
        () => [...document.querySelectorAll('th')].find((t) => /Ingresso/i.test(t.innerText)).getAttribute('aria-sort'),
      );
      check('the header announces the sort', aria === 'ascending', aria);

      await page.reload({ waitUntil: 'networkidle0' });
      await waitForText(page, 'Erin Student');
      const kept = await page.evaluate(() => location.search);
      check('reloading keeps the sort', /sort=entryYear/.test(kept), kept);
    },
  },
  {
    name: 'theme and layout',
    run: async (ctx, check) => {
      const opened = await openPage(ctx.browser, { theme: 'dark' });
      ctx.sessions.push(opened);
      const { page } = opened;
      await page.evaluateOnNewDocument(() => {
        document.addEventListener('DOMContentLoaded', () => {
          window.__themeAtDomReady = document.documentElement.getAttribute('data-theme');
        });
      });
      await login(page, ADMIN);
      await goto(page, '/app');
      await waitForText(page, 'Bem-vindo');
      const early = await page.evaluate(() => window.__themeAtDomReady);
      check('a saved dark theme is applied before the first paint', early === 'dark', String(early));

      const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check('dark colours apply', canvas === 'rgb(11, 17, 32)', canvas);

      await page.click('button[aria-label="Recolher menu"]');
      await sleep(400);
      await page.reload({ waitUntil: 'networkidle0' });
      await waitForText(page, 'Bem-vindo');
      await sleep(300);
      const width = await page.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
      check('a collapsed sidebar is remembered', width < 100, `${width}px`);
    },
  },
  {
    name: 'phone layout',
    run: async (ctx, check) => {
      const { page } = await session(ctx, STUDENT_BY_MATRICULA, { width: 390, height: 844 });
      await waitForText(page, 'Meu curso');

      const sidebar = await page.evaluate(() => {
        const aside = document.querySelector('aside');
        return aside ? aside.getBoundingClientRect().width : 0;
      });
      check('the sidebar is hidden on a phone', sidebar === 0, `${sidebar}px`);

      await page.click('button[aria-label="Abrir menu"]');
      await page.waitForSelector('[role="dialog"]');
      const links = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] a')].map((a) => a.innerText.trim()));
      check('the drawer lists the student modules', links.join('|') === 'Painel acadêmico|Inscrição em turmas|Avisos|Calendário acadêmico|Meu curso|Meus dados', links.join('|'));
      await page.keyboard.press('Escape');
      await sleep(300);

      for (const path of ['/app', '/app/my-course', '/app/my-course/subjects', '/app/profile']) {
        await goto(page, path);
        await sleep(500);
        const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(`no horizontal page scroll: ${path}`, extra <= 0, `${extra}px`);
      }
    },
  },
  {
    name: 'semester operations',
    run: async (ctx, check) => {
      const clickText = (page, text) =>
        page.evaluate((needle) => {
          const element = [...document.querySelectorAll('label, button, [role="radio"]')].find(
            (e) => e.innerText.trim() === needle,
          );
          if (!element) return false;
          element.click();
          return true;
        }, text);

      // Enrolling registers a request; the seat is only decided after the period (RN03).
      const judy = await session(ctx, '2026000002');
      await goto(judy.page, '/app/enrollment');
      await waitForText(judy.page, 'Inscrições abertas');
      await waitForText(judy.page, 'Linear Algebra');
      await clickByLabel(judy.page, 'Inscrever-se em MAT103 T01 - Linear Algebra');
      await waitForText(judy.page, 'Solicitação registrada');
      await waitForText(judy.page, 'Cancelar solicitação');
      const requested = await judy.page.evaluate(() =>
        [...document.querySelectorAll('tr')].find((row) => row.innerText.includes('MAT103 T01') && row.innerText.includes('Solicitada'))?.innerText ?? '',
      );
      check('enrolling registers a request, not a seat', requested.includes('Solicitada') && !requested.includes('Cursando'));

      // A missing prerequisite is explained, not silently refused (RN04, MSG01).
      const erin = await session(ctx, STUDENT_BY_MATRICULA);
      await goto(erin.page, '/app/enrollment');
      await waitForText(erin.page, 'Data Structures');
      await clickByLabel(erin.page, 'Inscrever-se em CC102 T01 - Data Structures');
      await waitForText(erin.page, 'Pré-requisito não atendido');
      check('a missing prerequisite is explained in Portuguese', true);

      // The academic panel gathers grades, attendance, activities and news (UC03).
      await goto(erin.page, '/app/panel');
      await waitForText(erin.page, 'CC101 T01 - Introduction to Programming');
      const panel = await bodyText(erin.page);
      check(
        'the panel shows grades, attendance, activity and news',
        panel.includes('Prova 1') &&
          panel.includes('8,6') &&
          panel.includes('Lista de exercícios 1') &&
          panel.includes('Primeira prova'),
      );
      check('the panel keeps the closed class outcome', panel.includes('Reprovado por nota'));

      // The Administration approves a class a teacher requested (UC08, RN01).
      const bob = await session(ctx, SECRETARY);
      await goto(bob.page, '/app/classes?status=pending');
      await waitForText(bob.page, 'Databases');
      await clickButton(bob.page, 'Aprovar');
      await waitForText(bob.page, 'aprovada e aberta para inscrição');
      check('the Administration approves a pending class', true);
      await goto(erin.page, '/app/enrollment');
      await waitForText(erin.page, 'Databases');
      check('the approved class is now in the catalogue', true);

      // Once the period ends, the Administration allocates the seats.
      const api = async (path, options = {}, token) =>
        (await fetch(`${API_URL}${path}`, {
          ...options,
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        })).json();
      const { accessToken } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: SECRETARY, password: 'password123' }) });
      const [calendar] = await api('/calendars', {}, accessToken);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      await api(`/calendars/${calendar.id}`, { method: 'PATCH', body: JSON.stringify({ enrollmentEnd: yesterday }) }, accessToken);

      await goto(bob.page, '/app/calendar');
      await waitForText(bob.page, 'Alocar vagas');
      await clickButton(bob.page, 'Alocar vagas');
      await bob.page.waitForSelector('[role="dialog"]');
      await clickButton(bob.page, 'Alocar vagas', '[role="dialog"]');
      await waitForText(bob.page, 'Alocação concluída');
      check('the Administration allocates the seats after the period', true);

      await goto(judy.page, '/app/enrollment');
      await waitForText(judy.page, 'Minhas inscrições');
      const confirmed = await judy.page.evaluate(() =>
        [...document.querySelectorAll('tr')].find((row) => row.innerText.includes('MAT103 T01') && row.innerText.includes('Cursando'))?.innerText ?? '',
      );
      check('the allocated request becomes an enrollment', confirmed.includes('Cursando'));

      // The teacher in charge sees the grade sheet and the attendance.
      const carol = await session(ctx, TEACHER);
      await goto(carol.page, '/app/classes');
      await waitForText(carol.page, 'CC101 T01 - Introduction to Programming');
      await carol.page.evaluate(() =>
        [...document.querySelectorAll('a')]
          .find((a) => a.innerText.includes('CC101 T01') && a.href.includes('/classes/'))
          .click(),
      );
      await waitForText(carol.page, 'Alunos inscritos');
      await clickText(carol.page, 'Notas');
      await waitForText(carol.page, 'Média mínima para aprovação');
      const sheet = await bodyText(carol.page);
      // Table headers are upper-cased by CSS, so compare without case.
      const lower = sheet.toLowerCase();
      check('the teacher sees the grade sheet', lower.includes('erin student') && lower.includes('prova 1'));
      await clickText(carol.page, 'Frequência');
      await waitForText(carol.page, 'Aulas registradas');
      check('the teacher sees the attendance', true);

      // A student does not reach the class management screens.
      await goto(erin.page, '/app/classes');
      await erin.page.waitForFunction(() => location.pathname === '/app', { timeout: 10000 });
      check('a student is redirected away from /app/classes', true);
    },
  },
];

async function fillLogin(page, identifier, password) {
  const set = (selector, value) =>
    page.evaluate(
      (sel, val) => {
        const element = document.querySelector(sel);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, val);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      },
      selector,
      value,
    );
  await set('input[inputmode="numeric"]', identifier);
  await clickButton(page, 'Continuar');
  await page.waitForSelector('input[type="password"]');
  await set('input[type="password"]', password);
  await clickButton(page, 'Entrar');
}

export default {
  name: 'flows',
  async run(ctx) {
    ctx.sessions = [];
    for (const flow of FLOWS) {
      const check = (name, ok, detail = '') => ctx.record(`${flow.name}: ${name}`, ok, detail);
      try {
        await flow.run(ctx, check);
      } catch (error) {
        ctx.record(`${flow.name}: completed`, false, String(error.message).split('\n')[0]);
      }
    }

    const unexpected = ctx.sessions
      .flatMap((session) => session.consoleErrors)
      .filter((message) => !EXPECTED_CONSOLE.test(message));
    ctx.record(
      'no unexpected console errors',
      unexpected.length === 0,
      unexpected.slice(0, 3).join(' || '),
    );

    for (const session of ctx.sessions) await session.context.close().catch(() => {});
    void WEB_URL;
  },
};
