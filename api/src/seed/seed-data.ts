export interface SeedUser {
  cpf: string;
  name: string;
  email: string;
  roleId: number;
  password: string | null;
}

export const SEED_USERS: readonly SeedUser[] = [
  {
    cpf: '12345678909',
    name: 'Alice Admin',
    email: 'alice@example.com',
    roleId: 1,
    password: 'password123',
  },
  {
    cpf: '98765432100',
    name: 'Bob Manager',
    email: 'bob@example.com',
    roleId: 2,
    password: 'password123',
  },
  {
    cpf: '11122233396',
    name: 'Carol Analyst',
    email: 'carol@example.com',
    roleId: 3,
    password: 'password123',
  },
  {
    cpf: '45678912364',
    name: 'Dave Pending',
    email: 'dave@example.com',
    roleId: 3,
    password: null,
  },
];
