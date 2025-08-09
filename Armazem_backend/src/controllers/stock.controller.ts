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