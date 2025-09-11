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

export async function visualizarUsuarios(req: FastifyRequest, reply: FastifyReply) {
  try {
    const requesterId = Number((req.user as any)?.id);
    if (!requesterId) return reply.code(401).send({ error: 'unauthorized' });

    const isSuperAdmin = await prisma.usuarioRole.findFirst({
      where: {
        usuarioId: requesterId,
        role: { nome: 'SUPER-ADMIN' },
      },
      select: { usuarioId: true },
    });

    if (isSuperAdmin) {
      const users = await prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          roles: { include: { role: true } },
        },
        orderBy: { id: 'asc' },
      });

      return reply.send(
        users.map(u => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          permissoes: (u.roles ?? []).map(r => r.role.nome), 
        }))
      );
    }

    const isAdmin = await prisma.usuarioRole.findFirst({
      where: {
        usuarioId: requesterId,
        role: { nome: 'ADMIN' },
      },
      select: { usuarioId: true },
    });

    if (!isAdmin) {
      return reply.send([]);
    }

    const meusEstoques = await prisma.usuarioEstoque.findMany({
      where: { usuarioId: requesterId, role: 'ADMIN' },
      select: { estoqueId: true },
    });
    const estoqueIds = [...new Set(meusEstoques.map(e => e.estoqueId))];
    if (estoqueIds.length === 0) return reply.send([]);

    const vinculados = await prisma.usuarioEstoque.findMany({
      where: { estoqueId: { in: estoqueIds } },
      select: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            roles: { include: { role: true } },
          },
        },
      },
    });

    const map = new Map<number, { id: number; nome: string | null; email: string; permissoes: string[] }>();
    for (const v of vinculados) {
      const u = v.usuario;
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          nome: u.nome,
          email: u.email,
          permissoes: (u.roles ?? []).map(rr => rr.role.nome),
        });
      }
    }

    return reply.send(Array.from(map.values()));
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
