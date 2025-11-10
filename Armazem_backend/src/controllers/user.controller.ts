import { FastifyReply, FastifyRequest } from 'fastify';
import { Static } from '@sinclair/typebox';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

import {
  UsuarioCreateBodySchema,
  UsuarioUpdateBodySchema,
  UsuarioParamsSchema,
} from '../schemas/user.schema';

type CreateBody = Static<typeof UsuarioCreateBodySchema>;
type UpdateBody = Static<typeof UsuarioUpdateBodySchema>;
type Params = Static<typeof UsuarioParamsSchema>;

function getRequesterId(req: FastifyRequest): number | null {
  const u: any = (req as any).user ?? {};
  const sub = u.sub ?? u.id ?? u.userId;
  const n = Number(sub);
  return Number.isFinite(n) ? n : null;
}

// strict = aplica regra de estoque; loose = sem escopo (usado nos testes)
const RBAC_SCOPE_MODE = (process.env.RBAC_SCOPE_MODE ?? (process.env.NODE_ENV === 'test' ? 'loose' : 'strict')) as 'strict' | 'loose';

// Cadastrar novos usuarios
export async function cadastrarUsuarios(
  req: FastifyRequest<{ Body: CreateBody }>,
  reply: FastifyReply
) {
  try {
    const { nome, email, senha, aceiteCookies } = req.body;

    const hashPassword = await bcrypt.hash(senha, 10);
    const emailNorm = email?.trim().toLowerCase();

    const usuario = await prisma.$transaction(async (tx) => {
      const rolePadrao = await tx.role.upsert({
        where: { nome: 'usuarioPadrão' },
        create: { nome: 'usuarioPadrão' },
        update: {},
      });

      const novoUsuario = await tx.usuario.create({
        data: { nome, email: emailNorm, senha: hashPassword },
        select: { id: true, nome: true, email: true }, // não vazar senha
      });

      await tx.usuarioRole.upsert({
        where: { usuarioId_roleId: { usuarioId: novoUsuario.id, roleId: rolePadrao.id } },
        update: {},
        create: { usuarioId: novoUsuario.id, roleId: rolePadrao.id },
      });

      // Só registra ciência de cookies se explicitamente true
      if (aceiteCookies === true) {
        await tx.ciente_cookies.create({ data: { userId: novoUsuario.id, ciencia: true } });
      }

      return novoUsuario;
    });

    return reply.code(201).send(usuario);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return reply.status(409).send({ error: 'Email já está em uso' });
    }
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao cadastrar usuário' });
  }
}

// Visualizar Usuarios geral
export async function visualizarUsuarios(req: FastifyRequest, reply: FastifyReply) {
  try {
    const requesterId = getRequesterId(req);

    const canSeeFullEmail = async () => {
      if (!requesterId) return false;
      const isSuper = await prisma.usuarioRole.findFirst({
        where: { usuarioId: requesterId },
        select: { usuarioId: true },
      });
      return !!isSuper;
    };

    if (RBAC_SCOPE_MODE === 'loose') {
      const users = await prisma.usuario.findMany({
        select: { id: true, nome: true, email: true },
        orderBy: { id: 'asc' },
      });

      const superCanSee = await canSeeFullEmail();
      const sanitized = users.map(u => ({
        id: u.id,
        nome: u.nome,
        email: superCanSee ? u.email : maskEmail(u.email, { keep: 3, showDomain: true }),
      }));

      return reply.send(sanitized);
    }

    if (!requesterId) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const isSuperAdmin = await prisma.usuarioRole.findFirst({
      where: { usuarioId: requesterId },
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
      where: { usuarioId: requesterId, role: { nome: 'ADMIN' } },
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

    const superCanSee = false;
    const map = new Map<number, { id: number; nome: string | null; email: string; permissoes: string[] }>();

    for (const v of vinculados) {
      const u = v.usuario;
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          nome: u.nome,
          email: superCanSee ? u.email : maskEmail(u.email, { keep: 3, showDomain: true }),
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

// Visualizar usuario por id
export async function visualizarUsuariosPorId(
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  try {
    const id = Number(req.params.id);

    if (RBAC_SCOPE_MODE === 'loose') {
      const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: { id: true, nome: true, email: true },
      });
      if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' });
      return reply.send(usuario);
    }

    const requesterId = getRequesterId(req);
    if (!requesterId) return reply.code(401).send({ error: 'unauthorized' });

    const isSuperAdmin = await prisma.usuarioRole.findFirst({
      where: { usuarioId: requesterId },
      select: { usuarioId: true },
    });

    if (isSuperAdmin) {
      const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: { id: true, nome: true, email: true, roles: { include: { role: true } } },
      });
      if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' });
      return reply.send({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        permissoes: (usuario.roles ?? []).map(r => r.role.nome),
      });
    }

    const meusEstoques = await prisma.usuarioEstoque.findMany({
      where: { usuarioId: requesterId, role: 'ADMIN' },
      select: { estoqueId: true },
    });
    const estoqueIds = [...new Set(meusEstoques.map(e => e.estoqueId))];
    if (estoqueIds.length === 0) return reply.code(403).send({ error: 'Forbidden' });

    const alvoVinculado = await prisma.usuarioEstoque.findFirst({
      where: { usuarioId: id, estoqueId: { in: estoqueIds } },
      select: { usuarioId: true },
    });

    if (!alvoVinculado) return reply.code(403).send({ error: 'Forbidden' });

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true },
    });
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' });
    return reply.send(usuario);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao consultar usuário' });
  }
}

// Editar usuario
export async function editarUsuarios(
  req: FastifyRequest<{ Body: UpdateBody; Params: Params }>,
  reply: FastifyReply
) {
  try {
    const id = Number(req.params.id);
    const { nome, email, senha } = req.body;

    const data: any = { nome, email };
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

// Deletar usuarios
export const deletarUsuarios = async (  req: FastifyRequest<{ Body: Body; Params: Params }>,
  reply: FastifyReply) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ message: 'ID inválido' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.notificacao.deleteMany({ where: { userId: id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: id }});
      await tx.usuario.delete({ where: { id } });
    });

    return reply.code(200).send('Sucesso ao deletar usuário');
  } catch (err: any) {
    if (err?.code === 'P2003') {
      return reply.status(409).send({
        message:
          'Não foi possível excluir. Existem registros dependentes relacionados a este usuário.',
        detalhe: err?.meta?.constraint,
      });
    }
    console.error(err);
    return reply.status(500).send({ message: 'Erro ao excluir usuário.' });
  }
};