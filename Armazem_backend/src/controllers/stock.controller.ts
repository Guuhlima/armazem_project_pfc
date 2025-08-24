import { FastifyReply, FastifyRequest } from 'fastify';
import { EstoqueBodySchema, EstoqueParamsSchema } from 'schemas/stock.schema';
import { Static } from '@sinclair/typebox';
import { prisma } from '../lib/prisma';

type Body = Static<typeof EstoqueBodySchema>;
type Params = Static<typeof EstoqueParamsSchema>;

export async function cadastrarEstoque(req: FastifyRequest<{ Body: Body }>, reply: FastifyReply) {
    try {
        const { nome } = req.body;
        const novoEstoque = await prisma.estoque.create({ data: { nome } });
        reply.send(novoEstoque);
    } catch (error) {
        reply.status(500).send({ error: 'Erro ao cadastrar estoque' });
        console.error(error);
    }
}

export async function visualizarEstoque(_: FastifyRequest, reply: FastifyReply) {
    try {
        const estoques = await prisma.estoque.findMany();
        reply.send(estoques);
    } catch (error) {
        reply.status(500).send({ error: 'Erro ao buscar estoques' });
        console.error(error);
    }
}

export async function visualizarEstoquePorId(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
    try {
        const { id } = req.params;
        const estoque = await prisma.estoque.findUnique({ where: { id: parseInt(id) } });

        if (!estoque) {
            return reply.status(404).send({ error: 'Estoque não encontrado' });
        }

        reply.send(estoque);
    } catch (error) {
        reply.status(500).send({ error: 'Erro ao buscar estoque' });
        console.error(error);
    }
}

export async function editarEstoque(req: FastifyRequest<{ Body: Body, Params: Params }>, reply: FastifyReply) {
    try {
        const { id } = req.params;
        const { nome } = req.body;

        const editarEstoque = await prisma.estoque.update({
            where: { id: parseInt(id) },
            data: { nome },
        });

        reply.send(editarEstoque);
    } catch (error) {
        reply.status(500).send({ error: 'Erro ao editar estoque' });
        console.error(error);
    }
}

export async function deletarEstoque(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
    try {
        const { id } = req.params;

        const deletarEstoque = await prisma.estoque.delete({
            where: { id: parseInt(id) },
        });

        reply.send(deletarEstoque);
    } catch (error: any) {
        if (error.code === 'P2025') {
            reply.status(404).send({ error: 'Estoque não encontrado' });
        } else {
            reply.status(500).send({ error: 'Erro ao deletar estoque' });
            console.error(error);
        }
    }
}

export async function visualizarItensPorEstoque(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
    try {
        const { id } = req.params;

        const estoque = await prisma.estoque.findUnique({
            where: { id: parseInt(id) },
            include: {
                itens: {
                    include: {
                        item: true
                    }
                }
            }
        });

        if (!estoque) return reply.status(404).send({ error: 'Estoque não encontrado' });

        reply.send(estoque.itens);
    } catch (error) {
        reply.status(500).send({ error: 'Erro ao buscar itens do estoque' });
        console.error(error);
    }
}

export async function meusEstoques(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) {
      return reply.code(401).send({ error: 'não autenticado' });
    }

    const vinculos = await prisma.usuarioEstoque.findMany({
      where: { usuarioId: userId },
      include: { estoque: true },
    });

    const warehouses = vinculos.map(v => ({
      id: v.estoque.id,
      nome: v.estoque.nome,
    }));

    return reply.send({ warehouses });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao buscar armazéns do usuário' });
  }
}

// === VINCULAR/ DESVINCULAR (usuário logado) ================================

export async function vincularMeAoEstoque(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const estoqueId = parseInt(req.params.id, 10);
    const estoque = await prisma.estoque.findUnique({ where: { id: estoqueId } });
    if (!estoque) return reply.code(404).send({ error: 'Estoque não encontrado' });

    await prisma.usuarioEstoque.upsert({
      where: { usuarioId_estoqueId: { usuarioId: userId, estoqueId } },
      update: {},
      create: { usuarioId: userId, estoqueId },
    });

    return reply.send({ ok: true, message: 'Vinculado com sucesso', estoque: { id: estoque.id, nome: estoque.nome } });
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Erro ao vincular usuário ao estoque' });
  }
}

export async function desvincularMeDoEstoque(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const estoqueId = parseInt(req.params.id, 10);

    await prisma.usuarioEstoque.delete({
      where: { usuarioId_estoqueId: { usuarioId: userId, estoqueId } },
    }).catch(() => { /* idempotente: se não existe, ok */ });

    return reply.send({ ok: true, message: 'Desvinculado com sucesso' });
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Erro ao desvincular usuário do estoque' });
  }
}

// === ADMIN: VINCULAR/ DESVINCULAR QUALQUER USUÁRIO =========================

export async function vincularUsuarioAoEstoque(
  req: FastifyRequest<{ Params: { userId: string; estoqueId: string } }>,
  reply: FastifyReply
) {
  try {
    const usuarioId = parseInt(req.params.userId, 10);
    const estoqueId = parseInt(req.params.estoqueId, 10);

    const [user, estoque] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: usuarioId } }),
      prisma.estoque.findUnique({ where: { id: estoqueId } }),
    ]);
    if (!user) return reply.code(404).send({ error: 'Usuário não encontrado' });
    if (!estoque) return reply.code(404).send({ error: 'Estoque não encontrado' });

    await prisma.usuarioEstoque.upsert({
      where: { usuarioId_estoqueId: { usuarioId, estoqueId } },
      update: {},
      create: { usuarioId, estoqueId },
    });

    return reply.send({ ok: true, message: 'Vínculo criado', usuarioId, estoqueId });
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Erro ao vincular usuário ao estoque' });
  }
}

export async function desvincularUsuarioDoEstoque(
  req: FastifyRequest<{ Params: { userId: string; estoqueId: string } }>,
  reply: FastifyReply
) {
  try {
    const usuarioId = parseInt(req.params.userId, 10);
    const estoqueId = parseInt(req.params.estoqueId, 10);

    await prisma.usuarioEstoque.delete({
      where: { usuarioId_estoqueId: { usuarioId, estoqueId } },
    }).catch(() => { /* idempotente */ });

    return reply.send({ ok: true, message: 'Vínculo removido', usuarioId, estoqueId });
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Erro ao desvincular usuário do estoque' });
  }
}

// === VALIDAÇÕES DE SOLICITAR ACESSO ===

export async function listarEstoquesDisponiveis(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const estoques = await prisma.estoque.findMany({
      where: { usuarios: { none: { usuarioId: userId } } }, // relation UsuarioEstoque em Estoque
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });

    return reply.send(estoques);
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Erro ao listar estoques' });
  }
}

export async function solicitarAcessoAoEstoque(
  req: FastifyRequest<{ Params: { id: string }, Body: { reason?: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const estoqueId = parseInt(req.params.id, 10);
    const { reason } = req.body ?? {};

    const estoque = await prisma.estoque.findUnique({ where: { id: estoqueId } });
    if (!estoque) return reply.code(404).send({ error: 'Estoque não encontrado' });

    const jaVinc = await prisma.usuarioEstoque.findUnique({
      where: { usuarioId_estoqueId: { usuarioId: userId, estoqueId } },
    });
    if (jaVinc) return reply.code(409).send({ error: 'Já vinculado' });

    const pend = await prisma.stockAccessRequest.findFirst({
      where: { usuarioId: userId, estoqueId, status: 'PENDING' },
    });
    if (pend) return reply.code(409).send({ error: 'Solicitação pendente' });

    const created = await prisma.stockAccessRequest.create({
      data: { usuarioId: userId, estoqueId, reason },
    });

    // 🔔 DESTINATÁRIOS DAS NOTIFICAÇÕES
    // a) SUPER-ADMIN (via UsuarioRole -> Role.nome)
    const superAdmins = await prisma.usuario.findMany({
      where: { roles: { some: { role: { nome: 'SUPER-ADMIN' } } } },
      select: { id: true },
    });

    // b) (opcional) Admins do próprio estoque
    const stockAdmins = await prisma.usuarioEstoque.findMany({
      where: { estoqueId, role: 'ADMIN' },
      select: { usuarioId: true },
    });

    const destinatarios = Array.from(new Set([
      ...superAdmins.map(u => u.id),
      ...stockAdmins.map(v => v.usuarioId),
    ]));

    if (destinatarios.length > 0) {
      await prisma.notificacao.createMany({
        data: destinatarios.map(uid => ({
          userId: uid,
          type: 'ACCESS_REQUEST',
          title: 'Solicitação de acesso ao armazém',
          message: `Usuário ${userId} solicitou acesso ao estoque ${estoque.nome}`,
          refId: created.id,
        })),
      });
    }

    return reply.send({ ok: true, solicitacaoId: created.id });
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Erro ao solicitar acesso' });
  }
}
