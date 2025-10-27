// tests/auth_usuarios.e2e.test.ts
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../utils/buildTestApp';
import { prisma } from 'lib/prisma';  // ajuste caminho
import { resetDb, seedRBAC, criarUsuarioComRoles } from '../utils/dbTestHelpers';
import { syncAllRolePermsToRedis } from 'lib/rbac-sync';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

beforeEach(async () => {
  await resetDb();
  await seedRBAC();
  await syncAllRolePermsToRedis(app);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

async function loginEObterToken(email: string, senha: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/user/login',
    payload: { email, senha },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(typeof body.token).toBe('string');
  jwt.verify(body.token, process.env.JWT_SECRET!); // JWT real
  return body.token as string;
}

describe('Cadastro público', () => {
  it('POST /usuarios/cadastro cria usuário (senha com hash)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/cadastro',
      payload: { nome: 'Ana', email: 'ana@a.com', senha: '12345678asd' },
    });
    expect([200, 201]).toContain(res.statusCode);
    const body = res.json();
    expect(body).toMatchObject({ nome: 'Ana', email: 'ana@a.com' });

    const db = await prisma.usuario.findUnique({ where: { email: 'ana@a.com' } });
    expect(db).toBeTruthy();
    expect(await bcrypt.compare('12345678asd', db!.senha!)).toBe(true);
  });

  it('409 se email duplicado', async () => {
    await prisma.usuario.create({
      data: { nome: 'X', email: 'dup@a.com', senha: await bcrypt.hash('x', 10) },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/cadastro',
      payload: { nome: 'Y', email: 'dup@a.com', senha: 'y' },
    });
    expect([409, 400]).toContain(res.statusCode);
  });
});

describe('Auth + RBAC', () => {
  it('login válido retorna token', async () => {
    await criarUsuarioComRoles({ email: 'adm@a.com', senha: 'senha' }, ['ADMIN']);
    const token = await loginEObterToken('adm@a.com', 'senha');
    expect(token).toBeTruthy();
  });

  it('GET /usuarios/visualizar requer user:manage', async () => {
    await criarUsuarioComRoles({ email: 'adm@a.com', senha: 'senha' }, ['ADMIN']); // ADMIN tem perms seedadas
    const token = await loginEObterToken('adm@a.com', 'senha');

    const res = await app.inject({
      method: 'GET',
      url: '/usuarios/visualizar',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('GET /usuarios/visualizar sem perm retorna 403/401', async () => {
    // usuário sem roles
    const hash = await bcrypt.hash('senha', 10);
    await prisma.usuario.create({
      data: { email: 'user@a.com', nome: 'User', senha: hash },
    });
    const token = await loginEObterToken('user@a.com', 'senha');

    const res = await app.inject({
      method: 'GET',
      url: '/usuarios/visualizar',
      headers: { authorization: `Bearer ${token}` },
    });
    expect([401, 403]).toContain(res.statusCode);
  });

  it('GET /usuarios/visualizar/:id com perm', async () => {
    await criarUsuarioComRoles({ email: 'adm@a.com', senha: 'senha' }, ['ADMIN']);
    const token = await loginEObterToken('adm@a.com', 'senha');

    const alvo = await prisma.usuario.create({
      data: { email: 'j@j', nome: 'Jo',  senha: await bcrypt.hash('x', 10) },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/usuarios/visualizar/${alvo.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(expect.objectContaining({ id: alvo.id, email: 'j@j' }));
  });

  it('PUT /usuarios/editar/:id (user:manage)', async () => {
    await criarUsuarioComRoles({ email: 'adm@a.com', senha: 'senha' }, ['ADMIN']);
    const token = await loginEObterToken('adm@a.com', 'senha');

    const u = await prisma.usuario.create({
      data: { email: 'v@v', nome: 'Velho',  senha: await bcrypt.hash('abc32435@', 10) },
    });

    const res = await app.inject({
      method: 'PUT',
      url: `/usuarios/editar/${u.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { nome: 'Novo', email: 'novo@n.com', senha: 'abc32435@' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ id: u.id, nome: 'Novo', email: 'novo@n.com' });

    const db = await prisma.usuario.findUnique({ where: { id: u.id } });
    expect(await bcrypt.compare('abc32435@', db!.senha!)).toBe(true);
  });

  it('DELETE /usuarios/deletar/:id (user:delete)', async () => {
    // cria role/permissions já seedadas; ADMIN tem user:delete pelo seedRBAC()
    await criarUsuarioComRoles({ email: 'deleter@a.com', senha: 'senha' }, ['ADMIN']);
    const token = await loginEObterToken('deleter@a.com', 'senha');

    const u = await prisma.usuario.create({
      data: { email: 'd@d', nome: 'Del', senha: await bcrypt.hash('x', 10) },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/usuarios/deletar/${u.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('Sucesso ao deletar usuário');
    expect(await prisma.usuario.findUnique({ where: { id: u.id } })).toBeNull();
  });
});
