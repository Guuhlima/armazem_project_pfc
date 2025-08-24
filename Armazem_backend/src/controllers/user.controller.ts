import { FastifyReply, FastifyRequest } from 'fastify';
import { Static } from '@sinclair/typebox';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

import {
  UsuarioBodySchema,
  UsuarioParamsSchema,
} from '../schemas/user.schema';

type Body = Static<typeof UsuarioBodySchema>;
type Params = Static<typeof UsuarioParamsSchema>;

export async function cadastrarUsuarios(
  req: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply
) {
  try {
    const { nome, email, matricula, senha } = req.body;
    const hashPassword = await bcrypt.hash(senha, 10);
    const emailNorm = email?.trim().toLowerCase();

    const usuario = await prisma.$transaction(async (tx) => {
      // RBAC novo: role padrão
      const rolePadrao = await tx.role.upsert({
        where: { nome: 'usuarioPadrão' },
        create: { nome: 'usuarioPadrão' },
        update: {},
      });

      const novoUsuario = await tx.usuario.create({
        data: {
          nome,
          email: emailNorm,
          matricula,
          senha: hashPassword,
        },
      });

      await tx.usuarioRole.upsert({
        where: {
          usuarioId_roleId: { usuarioId: novoUsuario.id, roleId: rolePadrao.id },
        },
        update: {},
        create: { usuarioId: novoUsuario.id, roleId: rolePadrao.id },
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

export async function visualizarUsuarios(_: FastifyRequest, reply: FastifyReply) {
  try {
    // lista users; se quiser incluir roles, dá pra joinar via usuarioRole
    const usuarios = await prisma.usuario.findMany();
    reply.send(usuarios);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao consultar usuários' });
  }
}

export async function visualizarUsuariosPorId(
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  try {
    const id = Number(req.params.id);
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' });
    reply.send(usuario);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao consultar usuário' });
  }
}

export async function editarUsuarios(
  req: FastifyRequest<{ Body: Body; Params: Params }>,
  reply: FastifyReply
) {
  try {
    const id = Number(req.params.id);
    const { nome, email, matricula, senha } = req.body;

    const data: any = { nome, email, matricula };
    if (senha) data.senha = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.update({ where: { id }, data });
    reply.send(usuario);
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Usuário não encontrado' });
    } else {
      console.error(error);
      reply.status(500).send({ error: 'Erro ao editar usuário' });
    }
  }
}

export async function deletarUsuarios(
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  try {
    const id = Number(req.params.id);
    await prisma.usuario.delete({ where: { id } });
    reply.send({ ok: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Usuário não encontrado' });
    } else {
      console.error(error);
      reply.status(500).send({ error: 'Erro ao deletar usuário' });
    }
  }
}
