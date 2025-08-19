import { FastifyReply, FastifyRequest } from 'fastify';
import { UsuarioBodySchema, UsuarioParamsSchema, UsuarioLoginSchema } from '../schemas/user.schema';
import { generateToken, hashPassword } from '../utils/password-reset';
import { sendPasswordResetEmail } from '../utils/mailer';
import { Static } from '@sinclair/typebox';
import { prisma } from '../lib/prisma';
import * as crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';

type Body = Static<typeof UsuarioBodySchema>;
type Params = Static<typeof UsuarioParamsSchema>;

export async function cadastrarUsuarios(req: FastifyRequest<{ Body: Body }>, reply: FastifyReply) {
  try {
    const { nome, email, matricula, senha } = req.body;

    const hashPassword = await bcrypt.hash(senha, 10);

    const usuario = await prisma.$transaction(async (tx) => {
      const permissaoPadrao = await tx.permissao.upsert({
        where: { nome: 'usuario' },
        create: { nome: 'usuario' },
        update: {},
      });

      const novoUsuario = await tx.usuario.create({
        data: {
          nome,
          email: email?.trim().toLowerCase(),
          matricula,
          senha: hashPassword,
          permissoes: {
            create: [
              {
                permissao: { connect: { id: permissaoPadrao.id } },
              },
            ],
          },
        },
        include: {
          permissoes: { include: { permissao: true } },
        },
      });

      return novoUsuario;
    });

    return reply.code(201).send(usuario);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return reply.status(409).send({ error: 'Email já está em uso' });
    }
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao cadastrar usuário' });
  }
}

export async function requestPasswordReset(req: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) {
  try {
    const { email } = req.body;

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      return reply.status(404).send({ error: 'E-mail não encontrado.' });
    }

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const { token, tokenHash } = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.WEB_APP_URL}/reset-password?email=${encodeURIComponent(
      email
    )}&token=${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    return reply.status(200).send({ message: 'E-mail de recuperação enviado.' });
  } catch (error) {
    console.error('Erro ao solicitar recuperação de senha', error);
    return reply.status(500).send({ error: 'Erro ao solicitar recuperação de senha' });
  }
}

export async function recoverPassword(
  req: FastifyRequest<{ Body: { email: string; token: string; senha: string } }>,
  reply: FastifyReply
) {
  try {
    const { email, token, senha } = req.body;

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      return reply.status(404).send({ error: 'E-mail não encontrado.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, tokenHash, usedAt: null },
    });

    if (!record) {
      return reply.status(400).send({ error: 'Token inválido.' });
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return reply.status(400).send({ error: 'Token expirado.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: user.id },
        data: { senha: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return reply.status(200).send({ message: 'Senha atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao recuperar senha', error);
    return reply.status(500).send({ error: 'Erro ao recuperar senha' });
  }
}

export async function login(req: FastifyRequest<{ Body: Static<typeof UsuarioLoginSchema> }>, reply: FastifyReply) {
  try {
    const { email, senha } = req.body;
    const candidate = email?.trim();

    const user = await prisma.usuario.findFirst({
      where: {
        email: {
          equals: candidate,
          mode: 'insensitive',
        },
      },
      include: {
        permissoes: { include: { permissao: true } },
      },
    });

    if (!user || !user.senha) {
      return reply.status(400).send({ error: 'Usuário ou senha inválidos' });
    }

    const isValid = await bcrypt.compare(senha, user.senha);
    if (!isValid) {
      return reply.status(401).send({ error: 'Senha incorreta' });
    }

    const permissoes = user.permissoes.map(p => p.permissao.nome);
    const payload = { id: user.id, nome: user.nome, email: user.email, permissoes };

    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '24h') as StringValue;
    if (!jwtSecret) throw new Error('JWT_SECRET não está definida nas variáveis de ambiente');

    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    return reply.send({
      message: 'Login realizado com sucesso',
      token,
      user: payload,
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao realizar login' });
  }
}

export async function visualizarUsuarios(_: FastifyRequest, reply: FastifyReply) {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: {
        permissoes: {
          include: {
            permissao: true,
          },
        },
      },
    });

    const usuariosComPermissoes = usuarios.map((user) => ({
      ...user,
      permissoes: user.permissoes.map((p) => p.permissao.nome),
    }));

    reply.send(usuariosComPermissoes);
  } catch (error) {
    reply.status(500).send({ error: 'Erro ao consultar usuários' });
    console.error(error);
  }
}

export async function visualizarUsuariosPorId(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  try {
    const id = parseInt(req.params.id);
    const usuario = await prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    reply.send(usuario);
  } catch (error) {
    reply.status(500).send({ error: 'Erro ao consultar usuário' });
    console.error(error);
  }
}

export async function deletarUsuarios(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  try {
    const id = parseInt(req.params.id);
    await prisma.usuario.delete({ where: { id } });

    reply.send('Sucesso ao deletar usuário');
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Usuário não encontrado' });
    } else {
      reply.status(500).send({ error: 'Erro ao deletar usuário' });
      console.error(error);
    }
  }
}

export async function editarUsuarios(req: FastifyRequest<{ Body: Body; Params: Params }>, reply: FastifyReply) {
  try {
    const id = parseInt(req.params.id);
    const { nome, email, matricula, senha } = req.body;

    const hashPassword = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nome,
        email,
        matricula,
        senha: hashPassword,
      },
    });

    reply.send(usuario);
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Usuário não encontrado' });
    } else {
      reply.status(500).send({ error: 'Erro ao editar usuário' });
      console.error(error);
    }
  }
}
