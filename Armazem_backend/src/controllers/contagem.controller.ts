import { FastifyReply, FastifyRequest } from "fastify";
import {
  gerarTarefasVencidas,
  listarTarefas,
  iniciarTarefa,
  lancarContagem,
  cancelarTarefa,
} from "../service/contagem-ciclica.service";

// Listar tarefas
export async function listarTarefasHandler(
  req: FastifyRequest<{ Querystring: { status?: string } }>,
  rep: FastifyReply
) {
  try {
    const tasks = await listarTarefas({ status: req.query.status as any });
    return rep.send(tasks);
  } catch (err) {
    req.log.error({ err }, "[contagem] erro ao listar tarefas");
    return rep.internalServerError("Falha ao listar tarefas");
  }
}

// Gerar tarefas vencidas
export async function gerarHandler(req: FastifyRequest, rep: FastifyReply) {
  try {
    const out = await gerarTarefasVencidas();
    req.log.info({ out }, "[contagem] gerarTarefasVencidas resultado");
    return rep.send(out);
  } catch (err) {
    req.log.error({ err }, "[contagem] erro ao gerar tarefas");
    return rep.internalServerError("Falha ao gerar tarefas de contagem");
  }
}


// Iniciar tarefa
export async function iniciarHandler(
  req: FastifyRequest<{ Params: { id: number }; Body: { userId: number } }>,
  rep: FastifyReply
) {
  try {
    const id = Number(req.params.id);
    const { userId } = req.body;

    const out = await iniciarTarefa(id, userId);
    if (!out.ok) return rep.code(400).send(out);

    return rep.send(out);
  } catch (err) {
    req.log.error({ err }, "[contagem] erro ao iniciar tarefa");
    return rep.internalServerError("Falha ao iniciar tarefa de contagem");
  }
}

// Lançar contagem
export async function lancarHandler(
  req: FastifyRequest<{ Params: { id: number }; Body: { userId: number; quantidade: number } }>,
  rep: FastifyReply
) {
  try {
    const id = Number(req.params.id);
    const { userId, quantidade } = req.body;

    const out = await lancarContagem(id, userId, quantidade);
    if (!out.ok) return rep.code(400).send(out);

    return rep.send(out);
  } catch (err) {
    req.log.error({ err }, "[contagem] erro ao lançar contagem");
    return rep.internalServerError("Falha ao lançar contagem");
  }
}

// Cancelar tarefa de contagem
export async function cancelarHandler(
  req: FastifyRequest<{ Params: { id: number }; Body: { motivo?: string } }>,
  rep: FastifyReply
) {
  try {
    const id = Number(req.params.id);
    const { motivo } = req.body ?? {};

    const out = await cancelarTarefa(id, motivo);
    if (!out.ok) return rep.code(400).send(out);

    return rep.send(out);
  } catch (err) {
    req.log.error({ err }, "[contagem] erro ao cancelar tarefa");
    return rep.internalServerError("Falha ao cancelar tarefa de contagem");
  }
}
