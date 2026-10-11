import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SEEDED, bootstrapApp, loginAs } from './helpers';

describe('Sorting and field errors (e2e)', () => {
  let app: INestApplication;
  let admin: { Authorization: string };

  const server = () => app.getHttpServer();
  const names = (res: { body: { items: { name: string }[] } }) =>
    res.body.items.map((item) => item.name);

  beforeAll(async () => {
    ({ app } = await bootstrapApp());
    admin = await loginAs(app, SEEDED.admin);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('students', () => {
    it('orders by name ascending by default', async () => {
      const res = await request(server()).get('/students').set(admin).expect(200);
      const list = names(res);
      expect(list).toEqual([...list].sort((a, b) => a.localeCompare(b)));
    });

    it('orders by name descending', async () => {
      const asc = await request(server()).get('/students?sort=name&order=asc').set(admin);
      const desc = await request(server()).get('/students?sort=name&order=desc').set(admin);

      expect(names(desc)).toEqual([...names(asc)].reverse());
    });

    it('orders by entry year, breaking ties by name', async () => {
      const res = await request(server())
        .get('/students?sort=entryYear&order=desc')
        .set(admin)
        .expect(200);
      const years = res.body.items.map((item: { entryYear: number }) => item.entryYear);

      expect(years).toEqual([...years].sort((a, b) => b - a));
      // 2026 has Erin and Judy: alphabetical inside the year.
      const in2026 = res.body.items
        .filter((item: { entryYear: number }) => item.entryYear === 2026)
        .map((item: { name: string }) => item.name);
      expect(in2026).toEqual([...in2026].sort((a, b) => a.localeCompare(b)));
    });

    it('orders by course and by matrícula', async () => {
      const byCourse = await request(server())
        .get('/students?sort=course&order=asc')
        .set(admin)
        .expect(200);
      const courses = byCourse.body.items.map(
        (item: { courseName: string }) => item.courseName,
      );
      expect(courses).toEqual([...courses].sort((a, b) => a.localeCompare(b)));

      const byNumber = await request(server())
        .get('/students?sort=registrationNumber&order=asc')
        .set(admin)
        .expect(200);
      const numbers = byNumber.body.items.map(
        (item: { registrationNumber: string }) => item.registrationNumber,
      );
      expect(numbers).toEqual([...numbers].sort());
    });

    it('keeps sorting across pages', async () => {
      const page1 = await request(server())
        .get('/students?sort=entryYear&order=asc&pageSize=3&page=1')
        .set(admin);
      const page2 = await request(server())
        .get('/students?sort=entryYear&order=asc&pageSize=3&page=2')
        .set(admin);
      const years = [...page1.body.items, ...page2.body.items].map(
        (item: { entryYear: number }) => item.entryYear,
      );

      expect(years).toEqual([...years].sort((a, b) => a - b));
    });

    it('rejects an unknown sort field or order (400, Portuguese)', async () => {
      const unknown = await request(server())
        .get('/students?sort=passwordHash')
        .set(admin)
        .expect(400);
      expect(unknown.body.errors).toEqual([
        { field: 'sort', message: 'Ordenação tem um valor inválido' },
      ]);

      await request(server()).get('/students?order=sideways').set(admin).expect(400);
    });
  });

  describe('other lists', () => {
    it('sorts teachers by department and title', async () => {
      const res = await request(server())
        .get('/teachers?sort=department&order=desc')
        .set(admin)
        .expect(200);
      const departments = res.body.items.map(
        (item: { departmentName: string }) => item.departmentName,
      );
      expect(departments).toEqual(
        [...departments].sort((a, b) => b.localeCompare(a)),
      );

      await request(server()).get('/teachers?sort=title&order=asc').set(admin).expect(200);
    });

    it('sorts staff by role', async () => {
      const res = await request(server())
        .get('/staff?sort=role&order=asc')
        .set(admin)
        .expect(200);
      const roles = res.body.items.map((item: { role: string }) => item.role);
      expect(roles).toEqual([...roles].sort());
    });

    it('sorts courses by semesters and by department', async () => {
      await request(server())
        .get('/courses?sort=totalSemesters&order=desc')
        .set(admin)
        .expect(200);

      const res = await request(server())
        .get('/courses?sort=department&order=asc')
        .set(admin)
        .expect(200);
      const departments = res.body.items.map(
        (item: { departmentName: string }) => item.departmentName,
      );
      expect(departments).toEqual([...departments].sort((a, b) => a.localeCompare(b)));
    });

    it('sorts subjects by workload and by name', async () => {
      const heavy = await request(server())
        .get('/subjects?sort=workloadHours&order=desc&pageSize=100')
        .set(admin)
        .expect(200);
      const hours = heavy.body.items.map(
        (item: { workloadHours: number }) => item.workloadHours,
      );
      expect(hours).toEqual([...hours].sort((a, b) => b - a));

      const byName = await request(server())
        .get('/subjects?sort=name&order=asc&pageSize=100')
        .set(admin)
        .expect(200);
      expect(names(byName)).toEqual([...names(byName)].sort((a, b) => a.localeCompare(b)));
    });
  });

  describe('field errors', () => {
    it('keys each validation failure by its property', async () => {
      const res = await request(server())
        .post('/students')
        .set(admin)
        .send({ cpf: '123', courseId: 'um', entryYear: 1800 })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining(['CPF deve ser um CPF válido']),
      );
      const byField = Object.fromEntries(
        res.body.errors.map((e: { field: string; message: string }) => [e.field, e.message]),
      );
      expect(byField.cpf).toBe('CPF deve ser um CPF válido');
      expect(byField.courseId).toBe('Curso deve ser um número inteiro');
      expect(byField.entryYear).toBe('Ano de ingresso está abaixo do mínimo permitido');
    });

    it('keeps message and errors in step, one entry per failure', async () => {
      const res = await request(server())
        .post('/users')
        .set(admin)
        .send({ cpf: '123', name: 'A', email: 'x', extra: true })
        .expect(400);

      expect(res.body.errors).toHaveLength(res.body.message.length);
      expect(res.body.errors.map((e: { message: string }) => e.message)).toEqual(
        res.body.message,
      );
      expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(
        expect.arrayContaining(['cpf', 'name', 'email', 'extra']),
      );
    });
  });
});
