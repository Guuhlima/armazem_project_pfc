import { FastifyReply, FastifyRequest } from 'fastify';
import { EquipamentoBodySchema, EquipamentoParamsSchema } from '../schemas/equipment.schema';
import { Static } from '@sinclair/typebox';
import { prisma } from '../lib/prisma';

type Body = Static<typeof EquipamentoBodySchema>;
type Params = Static<typeof EquipamentoParamsSchema>;

export async function cadastrarEquipamento(
  req: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply
) {
  try {
    const { nome, quantidade, data } = req.body;

    const novoEquipamento = await prisma.equipamento.create({
      data: {
        nome,
        quantidade,
        data: new Date(data),
      },
    });

    reply.send({
      id: novoEquipamento.id,
      nome: novoEquipamento.nome,
      quantidade: novoEquipamento.quantidade,
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao cadastrar equipamento' });
  }
}

export async function visualizarEquipamentos(_: FastifyRequest, reply: FastifyReply) {
  try {
    const equipamentos = await prisma.equipamento.findMany();
    reply.send(equipamentos);
  } catch (error) {
    reply.status(500).send({ error: 'Erro ao buscar equipamentos' });
    console.error(error);
  }
}

export async function visualizarEquipamentosPorId(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  try {
    const { id } = req.params;

    const equipamento = await prisma.equipamento.findUnique({
      where: { id: parseInt(id) },
    });

    if (!equipamento) {
      reply.status(404).send({ error: 'Equipamento não encontrado' });
      return;
    }

    reply.send(equipamento);
  } catch (error) {
    reply.status(500).send({ error: 'Erro ao buscar equipamento' });
    console.error(error);
  }
}

export async function editarEquipamento(req: FastifyRequest<{ Body: Body; Params: Params }>, reply: FastifyReply) {
  try {
    const { id } = req.params;
    const { nome, quantidade, data } = req.body;

    const equipamentoEditado = await prisma.equipamento.update({
      where: { id: parseInt(id) },
      data: {
        nome,
        quantidade,
        data: new Date(data),
      },
    });

    reply.send(equipamentoEditado);
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Equipamento não encontrado' });
    } else {
      reply.status(500).send({ error: 'Erro ao editar equipamento' });
      console.error(error);
    }
  }
}

export async function deletarEquipamento(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  try {
    const { id } = req.params;

    const equipamentoDeletado = await prisma.equipamento.delete({
      where: { id: parseInt(id) },
    });

    reply.send(equipamentoDeletado);
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Equipamento não encontrado' });
    } else {
      reply.status(500).send({ error: 'Erro ao deletar equipamento' });
      console.error(error);
    }
  }
}
