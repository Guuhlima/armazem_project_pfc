import { FastifyReply } from 'fastify';
import {
  cadastrarUsuarios,
  login,
  visualizarUsuarios,
  visualizarUsuariosPorId,
  deletarUsuarios,
  editarUsuarios,
} from '../../src/controllers/user.controller';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    usuario: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (s: string) => `hashed(${s})`),
  compare: jest.fn(async (a: string, b: string) => b === `hashed(${a})`),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed.jwt.token'),
}));

import { prisma } from '../../src/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

function createMockReply() {
  const reply: Partial<FastifyReply> & {
    statusCode?: number;
    payload?: any;
  } = {
    status: jest.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }) as any,
    send: jest.fn(function (this: any, payload: any) {
      (this as any).payload = payload;
      return this as any;
    }) as any,
  };
  return reply as FastifyReply & { statusCode?: number; payload?: any };
}

describe('User Controller', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, JWT_SECRET: 'secret', JWT_EXPIRES_IN: '24h' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('cadastrarUsuarios', () => {
    it('cria usuário e retorna payload', async () => {
      (prisma.usuario.create as jest.Mock).mockResolvedValue({
        id: 1,
        nome: 'Ana',
        email: 'ana@a.com',
        matricula: '123',
        senha: 'hashed(123456)',
      });

      const req: any = {
        body: { nome: 'Ana', email: 'ana@a.com', matricula: '123', senha: '123456' },
      };
      const reply = createMockReply();

      await cadastrarUsuarios(req, reply);

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
      expect(prisma.usuario.create).toHaveBeenCalledWith({
        data: { nome: 'Ana', email: 'ana@a.com', matricula: '123', senha: 'hashed(123456)' },
      });
      expect(reply.payload).toEqual({
        id: 1,
        nome: 'Ana',
        email: 'ana@a.com',
        matricula: '123',
        senha: 'hashed(123456)',
      });
    });

    it('retorna 409 em email duplicado (P2002)', async () => {
      (prisma.usuario.create as jest.Mock).mockRejectedValue({ code: 'P2002' });
      const req: any = { body: { nome: 'A', email: 'a@a', matricula: '1', senha: 'x' } };
      const reply = createMockReply();

      await cadastrarUsuarios(req, reply);

      expect(reply.status).toHaveBeenCalledWith(409);
      expect(reply.payload).toEqual({ error: 'Email já está em uso' });
    });
  });

  describe('login', () => {
    it('retorna token em login válido', async () => {
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        nome: 'Ana',
        email: 'ana@a.com',
        senha: 'hashed(123456)',
        permissoes: [
          { permissao: { nome: 'ADMIN' } },
          { permissao: { nome: 'READ' } },
        ],
      });

      const req: any = { body: { email: 'ana@a.com', senha: '123456' } };
      const reply = createMockReply();

      await login(req, reply);

      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: 'ana@a.com' },
        include: { permissoes: { include: { permissao: true } } },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed(123456)');
      expect(jwt.sign).toHaveBeenCalled();
      expect(reply.payload).toMatchObject({
        message: 'Login realizado com sucesso',
        token: 'signed.jwt.token',
        user: { id: 1, nome: 'Ana', email: 'ana@a.com', permissoes: ['ADMIN', 'READ'] },
      });
    });

    it('400 se usuário não encontrado ou sem senha', async () => {
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { body: { email: 'x@x', senha: 'a' } };
      const reply = createMockReply();

      await login(req, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.payload).toEqual({ error: 'Usuário ou senha inválidos' });
    });

    it('401 se senha incorreta', async () => {
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        nome: 'Ana',
        email: 'ana@a.com',
        senha: 'hashed(outro)',
        permissoes: [],
      });
      const req: any = { body: { email: 'ana@a.com', senha: '123456' } };
      const reply = createMockReply();

      await login(req, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.payload).toEqual({ error: 'Senha incorreta' });
    });

    it('500 se faltar JWT_SECRET', async () => {
      process.env.JWT_SECRET = '';
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        nome: 'Ana',
        email: 'ana@a.com',
        senha: 'hashed(123456)',
        permissoes: [],
      });
      const req: any = { body: { email: 'ana@a.com', senha: '123456' } };
      const reply = createMockReply();

      await login(req, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.payload).toEqual({ error: 'Erro ao realizar login' });
    });
  });

  describe('visualizarUsuarios', () => {
    it('retorna usuários com permissoes mapeadas', async () => {
      (prisma.usuario.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          nome: 'Ana',
          email: 'ana@a.com',
          senha: 'hashed',
          permissoes: [{ permissao: { nome: 'ADMIN' } }],
        },
      ]);

      const reply = createMockReply();
      await visualizarUsuarios({} as any, reply);

      expect(reply.payload).toEqual([
        {
          id: 1,
          nome: 'Ana',
          email: 'ana@a.com',
          senha: 'hashed',
          permissoes: ['ADMIN'],
        },
      ]);
    });
  });

  describe('visualizarUsuariosPorId', () => {
    it('200 quando encontra', async () => {
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ id: 10, nome: 'Jo', email: 'j@j' });

      const req: any = { params: { id: '10' } };
      const reply = createMockReply();

      await visualizarUsuariosPorId(req, reply);

      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(reply.payload).toEqual({ id: 10, nome: 'Jo', email: 'j@j' });
    });

    it('404 quando não encontra', async () => {
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);

      const req: any = { params: { id: '99' } };
      const reply = createMockReply();

      await visualizarUsuariosPorId(req, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.payload).toEqual({ error: 'Usuário não encontrado' });
    });
  });

  describe('deletarUsuarios', () => {
    it('deleta e retorna sucesso', async () => {
      (prisma.usuario.delete as jest.Mock).mockResolvedValue(undefined);

      const req: any = { params: { id: '7' } };
      const reply = createMockReply();

      await deletarUsuarios(req, reply);

      expect(prisma.usuario.delete).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(reply.payload).toBe('Sucesso ao deletar usuário');
    });

    it('404 em P2025', async () => {
      (prisma.usuario.delete as jest.Mock).mockRejectedValue({ code: 'P2025' });

      const req: any = { params: { id: '7' } };
      const reply = createMockReply();

      await deletarUsuarios(req, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.payload).toEqual({ error: 'Usuário não encontrado' });
    });
  });

  describe('editarUsuarios', () => {
    it('atualiza usuário', async () => {
      (prisma.usuario.update as jest.Mock).mockResolvedValue({
        id: 2,
        nome: 'Novo',
        email: 'novo@n.com',
        matricula: 'm2',
        senha: 'hashed(abc)',
      });

      const req: any = {
        params: { id: '2' },
        body: { nome: 'Novo', email: 'novo@n.com', matricula: 'm2', senha: 'abc' },
      };
      const reply = createMockReply();

      await editarUsuarios(req, reply);

      expect(bcrypt.hash).toHaveBeenCalledWith('abc', 10);
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { nome: 'Novo', email: 'novo@n.com', matricula: 'm2', senha: 'hashed(abc)' },
      });
      expect(reply.payload).toEqual({
        id: 2,
        nome: 'Novo',
        email: 'novo@n.com',
        matricula: 'm2',
        senha: 'hashed(abc)',
      });
    });

    it('404 em P2025', async () => {
      (prisma.usuario.update as jest.Mock).mockRejectedValue({ code: 'P2025' });

      const req: any = {
        params: { id: '2' },
        body: { nome: 'X', email: 'x@x', matricula: 'm', senha: 's' },
      };
      const reply = createMockReply();

      await editarUsuarios(req, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.payload).toEqual({ error: 'Usuário não encontrado' });
    });
  });
});
