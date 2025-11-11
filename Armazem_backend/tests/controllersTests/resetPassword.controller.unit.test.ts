import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify';

import {
  solicitarResetSenha,
  validarTokenReset,
  confirmarResetSenha,
} from '../../src/controllers/resetPassword.controller';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    usuario: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

jest.mock('../../src/lib/resetPassword', () => ({
  generateToken: jest.fn(),
  sha256: jest.fn(),
  sendEmail: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import bcrypt from 'bcrypt';
import { generateToken, sha256, sendEmail } from '../../src/lib/resetPassword';

function mockReply() {
  const reply: Partial<FastifyReply> = {
    status: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return reply as FastifyReply;
}

function mockRequest<
  RG extends RouteGenericInterface = RouteGenericInterface
>(...overrides: Array<Partial<FastifyRequest<RG>>>) {
  const req: Partial<FastifyRequest<RG>> = {
    log: { error: jest.fn() } as any,
  };
  Object.assign(req, ...overrides);
  return req as FastifyRequest<RG>;
}

beforeEach(() => {
  jest.clearAllMocks();
  delete (process as any).env.APP_URL;
});

describe('resetPassword.controller', () => {
  describe('solicitarResetSenha', () => {
    type RG = { Body: { email: string } };

    it('400 quando email ausente', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { email: '' } });

      await solicitarResetSenha(req, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'E-mail é obrigatório' });
    });

    it('200 genérico quando usuário não existe (sem vazar existência)', async () => {
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(null);

      const reply = mockReply();
      const req = mockRequest<RG>({ body: { email: 'noone@example.com' } });

      await solicitarResetSenha(req, reply);
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        message: 'Se o e-mail existir, enviaremos instruções para resetar a senha.',
      });
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('fluxo completo: invalida tokens antigos, cria novo, tenta enviar email e retorna genérico', async () => {
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({ id: 7, email: 'user@x.com' });
      (generateToken as jest.Mock).mockReturnValue('clear-token');
      (sha256 as jest.Mock).mockReturnValue('hashed-token');
      (prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: 99 });
      (sendEmail as jest.Mock).mockResolvedValue(undefined);

      const reply = mockReply();
      const req = mockRequest<RG>({ body: { email: 'User@X.com ' } }); // teste de trim e case-insensitive

      await solicitarResetSenha(req, reply);

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: 7, tokenHash: 'hashed-token', expiresAt: expect.any(Date) } })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        'user@x.com',
        expect.stringContaining('/auth/reset_password?token=')
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        message: 'Se o e-mail existir, enviaremos instruções para resetar a senha.',
      });
    });

    it('não falha se sendEmail lançar (continua 200)', async () => {
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({ id: 1, email: 'a@b.com' });
      (generateToken as jest.Mock).mockReturnValue('t');
      (sha256 as jest.Mock).mockReturnValue('h');
      (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: 1 });
      (sendEmail as jest.Mock).mockRejectedValue(new Error('smtp'));

      const reply = mockReply();
      const req = mockRequest<RG>({ body: { email: 'a@b.com' } });
      await solicitarResetSenha(req, reply);
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('500 se ocorrer erro inesperado', async () => {
      (prisma.usuario.findFirst as jest.Mock).mockRejectedValue(new Error('db down'));
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { email: 'a@b.com' } });

      await solicitarResetSenha(req, reply);
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao solicitar reset de senha' });
    });
  });

  describe('validarTokenReset', () => {
    type RG = { Body: { token: string } };

    it('400 quando token ausente', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: '' } });

      await validarTokenReset(req, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Token é obrigatório' });
    });

    it('400 quando token inválido/expirado', async () => {
      (sha256 as jest.Mock).mockReturnValue('h');
      (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(null);

      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: 'x' } });

      await validarTokenReset(req, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ valid: false, error: 'Token inválido ou expirado' });
    });

    it('200 quando token válido', async () => {
      const expiresAt = new Date(Date.now() + 1000 * 60);
      (sha256 as jest.Mock).mockReturnValue('h');
      (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue({ id: 1, expiresAt });

      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: 'ok' } });

      await validarTokenReset(req, reply);
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ valid: true, expiresAt });
    });

    it('500 em erro inesperado', async () => {
      (sha256 as jest.Mock).mockImplementation(() => { throw new Error('hash err'); });
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: 'any' } });

      await validarTokenReset(req, reply);
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao validar token' });
    });
  });

  describe('confirmarResetSenha', () => {
    type RG = { Body: { token: string; novaSenha: string } };

    it('400 quando token ou novaSenha não informados', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: '', novaSenha: '' } });
      await confirmarResetSenha(req, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('400 quando novaSenha < 8', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: 't', novaSenha: '1234567' } });
      await confirmarResetSenha(req, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'A senha deve ter pelo menos 8 caracteres' });
    });

    it('400 quando token inválido/expirado (INVALID_TOKEN via transaction)', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          passwordResetToken: {
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
            updateMany: jest.fn(),
          },
          usuario: { update: jest.fn() },
        };
        return cb(tx);
      });

      (sha256 as jest.Mock).mockReturnValue('h');

      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: 'bad', novaSenha: '12345678' } });

      await confirmarResetSenha(req, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
    });

    it('sucesso: atualiza senha, marca tokens como usados e retorna 200', async () => {
      const now = new Date();
      const record = { id: 11, userId: 77 };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          passwordResetToken: {
            findFirst: jest.fn().mockResolvedValue(record),
            update: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn().mockResolvedValue({}),
          },
          usuario: {
            update: jest.fn().mockResolvedValue({ id: record.userId }),
          },
        };
        return cb(tx);
      });

      (sha256 as jest.Mock).mockReturnValue('hash-ok');
      (bcrypt.hash as jest.Mock).mockResolvedValue('bcrypt-hash');

      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: 'clear-ok', novaSenha: 'longpassword' } });

      await confirmarResetSenha(req, reply);

      expect(bcrypt.hash).toHaveBeenCalledWith('longpassword', 10);

      expect(prisma.$transaction).toHaveBeenCalled();

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ message: 'Senha alterada com sucesso' });
    });

    it('500 em erro inesperado', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('db exploded'));
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { token: 't', novaSenha: '12345678' } });

      await confirmarResetSenha(req, reply);
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao confirmar reset de senha' });
    });
  });
});
