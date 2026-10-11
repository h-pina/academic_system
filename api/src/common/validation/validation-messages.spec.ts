import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { translateValidationErrors } from './validation-messages';
import { CreateUserDto } from '../../features/users/dto/create-user.dto';
import { LoginDto } from '../../features/auth/dto/login.dto';
import { CreateCourseDto } from '../../features/courses/dto/course.dto';

async function messagesFor<T extends object>(
  type: new () => T,
  payload: object,
): Promise<string[]> {
  const instance = plainToInstance(type, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return translateValidationErrors(errors);
}

describe('translateValidationErrors', () => {
  it('translates custom and built-in constraints with field labels', async () => {
    const messages = await messagesFor(CreateUserDto, {
      cpf: '123',
      name: 'Al',
      email: 'not-an-email',
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        'CPF deve ser um CPF válido',
        'Nome é curto demais',
        'E-mail deve ser um e-mail válido',
      ]),
    );
  });

  it('reports non-whitelisted properties', async () => {
    const messages = await messagesFor(CreateUserDto, {
      cpf: '12345678909',
      name: 'Alice',
      email: 'alice@example.com',
      roleId: 1,
    });

    expect(messages).toEqual(['O campo "roleId" não é permitido']);
  });

  it('translates the login identifier rule', async () => {
    const messages = await messagesFor(LoginDto, {
      identifier: 'abc',
      password: 'x',
    });
    expect(messages).toEqual(['Informe um CPF ou uma matrícula válidos']);
  });

  it('translates range and type constraints', async () => {
    const messages = await messagesFor(CreateCourseDto, {
      name: 'Ciência da Computação',
      code: 'CC',
      departmentId: 'one',
      totalSemesters: 99,
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        'Departamento deve ser um número inteiro',
        'Número de semestres está acima do máximo permitido',
      ]),
    );
  });

  it('never leaks the English default messages', async () => {
    const messages = await messagesFor(CreateUserDto, {});
    for (const message of messages) {
      expect(message).not.toMatch(/must be|should not|longer than/);
    }
    expect(messages.length).toBeGreaterThan(0);
  });
});
