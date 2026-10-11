import { ConflictException, INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Staff } from '../src/features/staff/entities/staff.entity';
import { Student } from '../src/features/students/entities/student.entity';
import { User } from '../src/features/users/entities/user.entity';
import { RolesService } from '../src/features/roles/roles.service';
import { StaffService } from '../src/features/staff/staff.service';
import { SEEDED, bootstrapApp, cpfFromBase, loginAs } from './helpers';

describe('Staff API and users without profile (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let seq = 0;

  let admin: { Authorization: string };
  let secretary: { Authorization: string };
  let teacher: { Authorization: string };

  const server = () => app.getHttpServer();

  const newStaff = (overrides: Record<string, unknown> = {}) => {
    const n = ++seq;
    return {
      cpf: cpfFromBase(500_000_000 + n),
      name: `Staff Member ${n}`,
      email: `staff${n}@example.com`,
      role: 'secretary',
      ...overrides,
    };
  };

  const userIdOf = async (cpf: string) =>
    (await ds.getRepository(User).findOneByOrFail({ cpf })).id;

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    teacher = await loginAs(app, SEEDED.teacher);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create and read', () => {
    it('creates a staff member and the user, without password', async () => {
      const body = newStaff();
      const res = await request(server())
        .post('/staff')
        .set(admin)
        .send(body)
        .expect(201);

      expect(res.body).toMatchObject({
        cpf: body.cpf,
        name: body.name,
        email: body.email,
        role: 'secretary',
        status: 'active',
        registrationNumber: null,
      });
      const user = await ds.getRepository(User).findOneByOrFail({ cpf: body.cpf });
      expect(user.passwordHash).toBeNull();
    });

    it('reuses an existing user (a student becomes also staff)', async () => {
      const studentId = await userIdOf(SEEDED.student);
      const usersBefore = await ds.getRepository(User).count();

      const res = await request(server())
        .post('/staff')
        .set(admin)
        .send({ cpf: SEEDED.student, role: 'secretary' })
        .expect(201);

      expect(res.body.userId).toBe(studentId);
      expect(await ds.getRepository(User).count()).toBe(usersBefore);
      expect(await ds.getRepository(Student).countBy({ userId: studentId })).toBe(1);
      expect(
        [...(await app.get(RolesService).resolveRoles(studentId))].sort(),
      ).toEqual(['secretary', 'student']);
    });

    it('rejects a person that is already staff (409)', async () => {
      await request(server())
        .post('/staff')
        .set(admin)
        .send({ cpf: SEEDED.secretary, role: 'secretary' })
        .expect(409);
    });

    it('rejects a new CPF without name and e-mail (400) and invalid roles (400)', async () => {
      await request(server())
        .post('/staff')
        .set(admin)
        .send({ cpf: cpfFromBase(600_000_001), role: 'secretary' })
        .expect(400);
      await request(server())
        .post('/staff')
        .set(admin)
        .send(newStaff({ role: 'manager' }))
        .expect(400);
    });

    it('lists, filters and paginates', async () => {
      const all = await request(server()).get('/staff').set(admin).expect(200);
      expect(all.body.total).toBeGreaterThanOrEqual(2);

      const admins = await request(server())
        .get('/staff?role=admin')
        .set(admin)
        .expect(200);
      expect(admins.body.items.every((i: { role: string }) => i.role === 'admin')).toBe(
        true,
      );

      const search = await request(server())
        .get('/staff?q=alice')
        .set(admin)
        .expect(200);
      expect(search.body.items.map((i: { cpf: string }) => i.cpf)).toEqual([
        SEEDED.admin,
      ]);

      const page = await request(server())
        .get('/staff?pageSize=1')
        .set(admin)
        .expect(200);
      expect(page.body.items).toHaveLength(1);
    });

    it('returns 404 for an unknown staff member', async () => {
      await request(server()).get('/staff/999999').set(admin).expect(404);
    });
  });

  describe('permissions', () => {
    it('is restricted to administrators', async () => {
      await request(server()).get('/staff').expect(401);
      for (const token of [secretary, teacher]) {
        await request(server()).get('/staff').set(token).expect(403);
        await request(server()).post('/staff').set(token).send(newStaff()).expect(403);
        await request(server()).patch('/staff/1').set(token).send({}).expect(403);
        await request(server()).delete('/staff/1').set(token).expect(403);
      }
    });
  });

  describe('last administrator and self protection', () => {
    it('does not let an admin change their own role or status (409)', async () => {
      const aliceId = await userIdOf(SEEDED.admin);

      await request(server())
        .patch(`/staff/${aliceId}`)
        .set(admin)
        .send({ role: 'secretary' })
        .expect(409);
      await request(server())
        .patch(`/staff/${aliceId}`)
        .set(admin)
        .send({ status: 'inactive' })
        .expect(409);
      await request(server()).delete(`/staff/${aliceId}`).set(admin).expect(409);
    });

    it('allows re-sending the current values for yourself', async () => {
      const aliceId = await userIdOf(SEEDED.admin);
      await request(server())
        .patch(`/staff/${aliceId}`)
        .set(admin)
        .send({ role: 'admin', status: 'active' })
        .expect(200);
    });

    it('protects the last active administrator at service level', async () => {
      // Through the API the actor is always another active admin, so this
      // defense is exercised directly with an actor that is not an admin.
      const staff = app.get(StaffService);
      const aliceId = await userIdOf(SEEDED.admin);
      const outsider = 999_999;

      await expect(
        staff.update(aliceId, { role: 'secretary' }, outsider),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        staff.update(aliceId, { status: 'inactive' }, outsider),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(staff.remove(aliceId, outsider)).rejects.toBeInstanceOf(
        ConflictException,
      );

      const view = await staff.get(aliceId);
      expect(view).toMatchObject({ role: 'admin', status: 'active' });
    });

    it('allows demoting an admin when another active admin remains', async () => {
      const second = await request(server())
        .post('/staff')
        .set(admin)
        .send(newStaff({ role: 'admin' }))
        .expect(201);

      // Alice (token `admin`) demotes the second admin: Alice remains.
      await request(server())
        .patch(`/staff/${second.body.userId}`)
        .set(admin)
        .send({ role: 'secretary' })
        .expect(200);
      await request(server())
        .delete(`/staff/${second.body.userId}`)
        .set(admin)
        .expect(204);
    });

    it('two admins cannot demote each other: the loser loses access at once', async () => {
      const second = await request(server())
        .post('/staff')
        .set(admin)
        .send(newStaff({ role: 'admin' }))
        .expect(201);
      const aliceId = await userIdOf(SEEDED.admin);
      const secondUser = await ds
        .getRepository(User)
        .findOneByOrFail({ id: second.body.userId });
      const alice = await ds.getRepository(User).findOneByOrFail({ id: aliceId });
      await ds
        .getRepository(User)
        .update({ id: secondUser.id }, { passwordHash: alice.passwordHash });
      const secondToken = await loginAs(app, second.body.cpf);

      // The second admin wins the race and demotes Alice...
      await request(server())
        .patch(`/staff/${aliceId}`)
        .set(secondToken)
        .send({ role: 'secretary' })
        .expect(200);

      // ...so Alice's still-valid token no longer works as admin (roles are
      // resolved per request) and cannot demote the last admin.
      await request(server())
        .patch(`/staff/${secondUser.id}`)
        .set(admin)
        .send({ role: 'secretary' })
        .expect(403);

      const remaining = await ds
        .getRepository(Staff)
        .countBy({ role: 'admin', status: 'active' });
      expect(remaining).toBeGreaterThanOrEqual(1);

      // Restore Alice for the rest of the suite.
      await ds.getRepository(Staff).update({ userId: aliceId }, { role: 'admin' });
      await ds.getRepository(Staff).delete({ userId: secondUser.id });
    });
  });

  describe('update and delete', () => {
    it('changes role and status of another staff member', async () => {
      const created = await request(server())
        .post('/staff')
        .set(admin)
        .send(newStaff())
        .expect(201);

      const res = await request(server())
        .patch(`/staff/${created.body.userId}`)
        .set(admin)
        .send({ status: 'inactive' })
        .expect(200);
      expect(res.body.status).toBe('inactive');

      // An inactive staff profile grants no role.
      expect(await app.get(RolesService).resolveRoles(created.body.userId)).toEqual(
        [],
      );
    });

    it('rejects invalid values (400) and unknown members (404)', async () => {
      const created = await request(server())
        .post('/staff')
        .set(admin)
        .send(newStaff())
        .expect(201);

      await request(server())
        .patch(`/staff/${created.body.userId}`)
        .set(admin)
        .send({ role: 'owner' })
        .expect(400);
      await request(server())
        .patch('/staff/999999')
        .set(admin)
        .send({ status: 'inactive' })
        .expect(404);
      await request(server()).delete('/staff/999999').set(admin).expect(404);
    });

    it('deletes only the staff profile, never the user', async () => {
      const created = await request(server())
        .post('/staff')
        .set(admin)
        .send(newStaff())
        .expect(201);

      await request(server())
        .delete(`/staff/${created.body.userId}`)
        .set(admin)
        .expect(204);

      expect(
        await ds.getRepository(Staff).countBy({ userId: created.body.userId }),
      ).toBe(0);
      expect(
        await ds.getRepository(User).countBy({ id: created.body.userId }),
      ).toBe(1);
    });
  });

  describe('users without profile', () => {
    it('lists exactly the users with no staff, teacher or student profile', async () => {
      const orphan = await request(server())
        .post('/users')
        .set(admin)
        .send({
          cpf: cpfFromBase(700_000_001),
          name: 'Nobody Linked',
          email: 'nobody.linked@example.com',
        })
        .expect(201);
      expect(orphan.body).toBeDefined();

      const res = await request(server())
        .get('/users/orphans')
        .set(admin)
        .expect(200);
      const cpfs = res.body.map((user: { cpf: string }) => user.cpf);

      expect(cpfs).toContain(cpfFromBase(700_000_001));
      expect(cpfs).toContain(SEEDED.noProfile);
      for (const linked of [
        SEEDED.admin,
        SEEDED.secretary,
        SEEDED.teacher,
        SEEDED.student,
      ]) {
        expect(cpfs).not.toContain(linked);
      }
      for (const user of res.body) {
        expect(user).not.toHaveProperty('passwordHash');
      }
    });

    it('is restricted to administrators', async () => {
      await request(server()).get('/users/orphans').expect(401);
      await request(server()).get('/users/orphans').set(secretary).expect(403);
      await request(server()).get('/users/orphans').set(teacher).expect(403);
    });

    it('stops listing a user once a profile is linked', async () => {
      const cpf = cpfFromBase(700_000_002);
      await request(server())
        .post('/users')
        .set(admin)
        .send({ cpf, name: 'Soon Linked', email: 'soon.linked@example.com' })
        .expect(201);

      const before = await request(server()).get('/users/orphans').set(admin);
      expect(before.body.map((u: { cpf: string }) => u.cpf)).toContain(cpf);

      await request(server())
        .post('/staff')
        .set(admin)
        .send({ cpf, role: 'secretary' })
        .expect(201);

      const after = await request(server()).get('/users/orphans').set(admin);
      expect(after.body.map((u: { cpf: string }) => u.cpf)).not.toContain(cpf);
    });
  });
});
