import { FastifyReply, FastifyRequest } from 'fastify';
import { Static } from '@sinclair/typebox';
import { prisma } from '../lib/prisma';
import { checarLimitesEGerenciarAlertas } from '../service/estoque-alertas.service';
import { sugerirFEFO, pickingFEFO, saidaPorSerial } from 'service/estoque.service';

// Schemas
import { EstoqueBodySchema, EstoqueParamsSchema } from 'schemas/stock.schema';
import { EstoqueMinimoBodySchema } from 'schemas/estoqueMinimo.schema';

// === Tipos (nomes únicos) ===
type CreateEstoqueBody = Static<typeof EstoqueBodySchema>;
type EstoqueIdParams = Static<typeof EstoqueParamsSchema>;
type SetMinimoBody = Static<typeof EstoqueMinimoBodySchema>;
type SetMinimoParams = { estoqueId: string; itemId: string };

// === CADASTRAR UM NOVO ESTOQUE ========
export async function cadastrarEstoque(
  req: FastifyRequest<{ Body: CreateEstoqueBody }>,
  reply: FastifyReply
) {
  try {
    const { nome } = req.body;
    const novoEstoque = await prisma.estoque.create({ data: { nome } });
    reply.send(novoEstoque);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao cadastrar estoque' });
  }
}

// === VISUALIZAR TODOS OS ESTOQUES =====
export async function visualizarEstoque(_: FastifyRequest, reply: FastifyReply) {
  try {
    const estoques = await prisma.estoque.findMany();
    reply.send(estoques);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao buscar estoques' });
  }
}

// === VISUALIZAR ESTOQUE POR ID ====
export async function visualizarEstoquePorId(
  req: FastifyRequest<{ Params: EstoqueIdParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params;
    const estoque = await prisma.estoque.findUnique({ where: { id: parseInt(id) } });
    if (!estoque) return reply.status(404).send({ error: 'Estoque não encontrado' });
    reply.send(estoque);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao buscar estoque' });
  }
}

// === EDITAR UM ESTOQUE =======
export async function editarEstoque(
  req: FastifyRequest<{ Body: CreateEstoqueBody; Params: EstoqueIdParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const editarEstoque = await prisma.estoque.update({
      where: { id: parseInt(id) },
      data: { nome },
    });
    reply.send(editarEstoque);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao editar estoque' });
  }
}

// === DELETAR UM ESTOQUE ====
export async function deletarEstoque(
  req: FastifyRequest<{ Params: EstoqueIdParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params;
    const deletarEstoque = await prisma.estoque.delete({ where: { id: parseInt(id) } });
    reply.send(deletarEstoque);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Estoque não encontrado' });
    } else {
      reply.status(500).send({ error: 'Erro ao deletar estoque' });
    }
  }
}

// === VISUALIZAR ITENS POR ESTOQUE ====
export async function visualizarItensPorEstoque(
  req: FastifyRequest<{ Params: EstoqueIdParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params;
    const estoque = await prisma.estoque.findUnique({
      where: { id: parseInt(id) },
      include: { itens: { include: { item: true } } },
    });
    if (!estoque) return reply.status(404).send({ error: 'Estoque não encontrado' });
    reply.send(estoque.itens);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao buscar itens do estoque' });
  }
}

// === MEUS ESTOQUES =====
export async function meusEstoques(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const vinculos = await prisma.usuarioEstoque.findMany({
      where: { usuarioId: userId },
      include: { estoque: true },
    });

    const warehouses = vinculos.map(v => ({ id: v.estoque.id, nome: v.estoque.nome }));
    return reply.send({ warehouses });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao buscar armazéns do usuário' });
  }
}

// DEFINIR MÍNIMO DE UM ITEM NO ESTOQUE ===
export async function definirMinimoItemNoEstoque(
  req: FastifyRequest<{ Params: SetMinimoParams; Body: SetMinimoBody }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = parseInt(req.params.estoqueId);
    const itemId = parseInt(req.params.itemId);
    const { minimo } = req.body;

    const updated = await prisma.estoqueItem.upsert({
      where: { itemId_estoqueId: { itemId, estoqueId } },
      update: { minimo },
      create: { itemId, estoqueId, quantidade: 0, minimo },
    });

    await checarLimitesEGerenciarAlertas(estoqueId, itemId);

    return reply.send(updated);
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao definir minimo' });
  }
}
// ABAIXO CONTROLLERS PARA SOLICITAR VINCULO AO ESTOQUE E DESVINCULAR USUARIO

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
    }).catch(() => { });

    return reply.send({ ok: true, message: 'Desvinculado com sucesso' });
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Erro ao desvincular usuário do estoque' });
  }
}

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
    }).catch(() => {
      return reply.code(500).send({ error: 'Erro ao deletar usuario do estoque'})
     });

    return reply.send({ ok: true, message: 'Vínculo removido', usuarioId, estoqueId });
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Erro ao desvincular usuário do estoque' });
  }
}

export async function listarEstoquesDisponiveis(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const estoques = await prisma.estoque.findMany({
      where: { usuarios: { none: { usuarioId: userId } } },
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

    const superAdmins = await prisma.usuario.findMany({
      where: { roles: { some: { role: { nome: 'SUPER-ADMIN' } } } },
      select: { id: true },
    });

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

// FEFO
export async function getSugerirFEFO(
  req: FastifyRequest<{ Querystring: { itemId: string; estoqueId: string; take?: string } }>,
  reply: FastifyReply
) {
  try {
    const { itemId, estoqueId, take } = req.query;
    const data = await sugerirFEFO(Number(itemId), Number(estoqueId), Number(take ?? 20));
    return reply.send(data);
  } catch (e: any) {
    return reply.code(400).send({ error: e?.message ?? 'Erro ao sugerir FEFO' });
  }
}

export async function postPickingFEFO(
  req: FastifyRequest<{ Body: {
    estoqueId: number; itemId: number; quantidadeSolicitada: number;
    referencia?: { tabela?: string; id?: number };
    permitirVencidos?: boolean;
  } }>,
  reply: FastifyReply
) {
  try {
    const { estoqueId, itemId, quantidadeSolicitada, referencia, permitirVencidos } = req.body;
    const r = await pickingFEFO({ estoqueId, itemId, quantidadeSolicitada, referencia, permitirVencidos });
    return reply.send(r);
  } catch (e: any) {
    return reply.code(400).send({ error: e?.message ?? 'Erro no picking FEFO' });
  }
}

export async function postSaidaSerial(
  req: FastifyRequest<{ Body: {
    estoqueId: number; itemId: number; serialNumero: string;
    referencia?: { tabela?: string; id?: number };
  } }>,
  reply: FastifyReply
) {
  try {
    const { estoqueId, itemId, serialNumero, referencia } = req.body;
    const r = await saidaPorSerial({ estoqueId, itemId, serialNumero, referencia });
    return reply.send(r);
  } catch (e: any) {
    return reply.code(400).send({ error: e?.message ?? 'Erro na saída por serial' });
  }
}

export async function getEstoqueItemConfig(
  req: FastifyRequest<{ Params: { estoqueId: string; itemId: string } }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = Number(req.params.estoqueId);
    const itemId = Number(req.params.itemId);

    const ei = await prisma.estoqueItem.findUnique({
      where: { itemId_estoqueId: { itemId, estoqueId } },
      select: {
        itemId: true,
        estoqueId: true,
        quantidade: true,
        minimo: true,
        autoAtivo: true,
        maximo: true,
        multiplo: true,
        origemPreferidaId: true,
        leadTimeDias: true,
      },
    });

    if (!ei) {
      return reply.send({
        itemId,
        estoqueId,
        quantidade: 0,
        minimo: 0,
        autoAtivo: false,
        maximo: null,
        multiplo: null,
        origemPreferidaId: null,
        leadTimeDias: null,
      });
    }

    return reply.send(ei);
  } catch (e) {
    req.log?.error(e, 'erro getEstoqueItemConfig');
    return reply.status(500).send({ error: 'Erro ao obter config do item no estoque' });
  }
}

export async function patchEstoqueItemAutoConfig(
  req: FastifyRequest<{
    Params: { estoqueId: string; itemId: string };
    Body: Partial<{
      autoAtivo: boolean;
      maximo: number | null;
      minimo: number | null;
      multiplo: number | null;
      origemPreferidaId: number | null | 0;
      leadTimeDias: number | null;
    }>;
  }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = Number(req.params.estoqueId);
    const itemId = Number(req.params.itemId);
    if (!Number.isFinite(estoqueId) || !Number.isFinite(itemId)) {
      return reply.code(400).send({ error: 'Parâmetros inválidos.' });
    }

    const hasBody = req.body && Object.keys(req.body).length > 0;

    const autoAtivo = req.body?.autoAtivo;
    const maximo = req.body?.maximo;
    const minimo = req.body?.minimo;
    const multiplo = req.body?.multiplo;
    const origemPreferidaId =
      req.body?.origemPreferidaId && req.body?.origemPreferidaId > 0
        ? req.body.origemPreferidaId
        : null;
    const leadTimeDias = req.body?.leadTimeDias;

    if (hasBody) {
      if (multiplo != null && multiplo < 1) {
        return reply.status(400).send({ error: 'multiplo deve ser >= 1' });
      }
      if (maximo != null && maximo < 0) {
        return reply.status(400).send({ error: 'maximo deve ser >= 0' });
      }
    }

    let updated: any = null;

    if (hasBody) {
      // upsert da config
      updated = await prisma.estoqueItem.upsert({
        where: { itemId_estoqueId: { itemId, estoqueId } },
        create: {
          itemId,
          estoqueId,
          quantidade: 0,
          minimo: 0,
          autoAtivo: !!autoAtivo,
          maximo: maximo ?? null,
          multiplo: multiplo ?? null,
          origemPreferidaId,
          leadTimeDias: leadTimeDias ?? null,
        } as any,
        update: {
          ...(autoAtivo !== undefined ? { autoAtivo } : {}),
          ...(maximo !== undefined ? { maximo } : {}),
          ...(minimo !== undefined ? { minimo } : {}),
          ...(multiplo !== undefined ? { multiplo } : {}),
          ...(req.body?.origemPreferidaId !== undefined ? { origemPreferidaId } : {}),
          ...(leadTimeDias !== undefined ? { leadTimeDias } : {}),
        },
        select: {
          itemId: true,
          estoqueId: true,
          quantidade: true,
          minimo: true,
          autoAtivo: true,
          maximo: true,
          multiplo: true,
          origemPreferidaId: true,
          leadTimeDias: true,
        },
      });
    }

    const result: any = await checarLimitesEGerenciarAlertas(estoqueId, itemId);

    return reply.send({
      ok: true,
      ...(hasBody ? { updated } : {}),
      result: {
        created: !!result?.created,
        agendamentoId: result?.agendamentoId ?? null,
        origemId: result?.origemId ?? null,
        quantidade: result?.quantidade ?? null,
        reason: result?.reason ?? null,
        debug: result?.debug ?? null,
        alert: result?.kind ? result : null,
      },
    });
  } catch (e) {
    (req.log as any)?.error?.(e, 'erro patchEstoqueItemAutoConfig');
    return reply.status(500).send({ error: 'Erro ao salvar/rodar automação do item' });
  }
}