import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { generateToken, sha256, sendEmail } from '../lib/resetPassword';


export async function solicitarResetSenha(
  req: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply
) {
  try {
    const email = req.body?.email?.trim();
    if (!email) return reply.status(400).send({ error: 'E-mail é obrigatório' });

    const user = await prisma.usuario.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true },
    });

    const GENERIC = { message: 'Se o e-mail existir, enviaremos instruções para resetar a senha.' };

    if (!user) {
      return reply.status(200).send(GENERIC);
    }

    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    const token = generateToken(32);
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/auth/reset_password?token=${encodeURIComponent(token)}`;

    try {
      await sendEmail(user.email, resetLink);
    } catch (e) {
      console.error('Falha ao enviar e-mail de reset:', e);
    }

    return reply.status(200).send(GENERIC);
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao solicitar reset de senha' });
  }
}

export async function validarTokenReset(
  req: FastifyRequest<{ Body: { token: string } }>,
  reply: FastifyReply
) {
  try {
    const token = req.body?.token?.trim();
    if (!token) return reply.status(400).send({ error: 'Token é obrigatório' });

    const tokenHash = sha256(token);
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, expiresAt: true },
    });

    if (!record) {
      return reply.status(400).send({ valid: false, error: 'Token inválido ou expirado' });
    }

    return reply.status(200).send({ valid: true, expiresAt: record.expiresAt });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao validar token' });
  }
}


export async function confirmarResetSenha(
  req: FastifyRequest<{ Body: { token: string; novaSenha: string } }>,
  reply: FastifyReply
) {
  try {
    const { token, novaSenha } = req.body || {};
    if (!token || !novaSenha) {
      return reply.status(400).send({ error: 'Token e nova senha são obrigatórios' });
    }
    if (novaSenha.length < 8) {
      return reply.status(400).send({ error: 'A senha deve ter pelo menos 8 caracteres' });
    }

    const tokenHash = sha256(token);

    await prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, userId: true },
      });
      if (!record) {
        throw new Error('INVALID_TOKEN');
      }

      const hash = await bcrypt.hash(novaSenha, 10);

      await tx.usuario.update({
        where: { id: record.userId },
        data: { senha: hash },
      });

      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
    });

    return reply.status(200).send({ message: 'Senha alterada com sucesso' });
  } catch (error: any) {
    if (error?.message === 'INVALID_TOKEN') {
      return reply.status(400).send({ error: 'Token inválido ou expirado' });
    }
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao confirmar reset de senha' });
  }
}
