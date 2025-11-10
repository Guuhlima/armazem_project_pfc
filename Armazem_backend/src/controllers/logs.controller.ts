import { FastifyReply, FastifyRequest } from "fastify";
import { LogService } from "../service/logs.service";
import { Type, Static } from "@sinclair/typebox";
import { normalizeSuccess } from "utils/utils";
import { TimeSeriesQuery, TopNQuery, ListQuery } from "../schemas/logs.schema";

export async function visualizarSeriesLogs(
  req: FastifyRequest<{ Querystring: Static<typeof TimeSeriesQuery> }>,
  reply: FastifyReply
) {
  const q = req.query;
  const inicio = new Date(q.inicio);
  const fim = new Date(q.fim);
  if (isNaN(+inicio) || isNaN(+fim)) {
    return reply.code(400).send({ error: "Datas inválidas" });
  }

  const data = await LogService.timeSeries({
    inicio,
    fim,
    granularity: q.granularity,
    type: q.type,
    action: q.action,
    success: normalizeSuccess(q.success as any),
    userId: q.userId,
    itemId: q.itemId,
    estoqueId: q.estoqueId,
    tz: q.tz,
  });

  return reply.send({ data });
}

export async function visualizarTopLogs(
  req: FastifyRequest<{ Querystring: Static<typeof TopNQuery> }>,
  reply: FastifyReply
) {
  const q = req.query;

  const data = await LogService.topN({
    inicio: new Date(q.inicio),
    fim: new Date(q.fim),
    type: q.type,
    action: q.action,
    field: q.field,
    limit: q.limit,
    success: normalizeSuccess(q.success as any),
  });

  return reply.send({ data });
}

export async function visualizarEventosLogs(
  req: FastifyRequest<{ Querystring: Static<typeof ListQuery> }>,
  reply: FastifyReply
) {
  const q = req.query;

  const data = await LogService.list({
    inicio: new Date(q.inicio),
    fim: new Date(q.fim),
    type: q.type,
    action: q.action,
    success: normalizeSuccess(q.success as any),
    q: q.q,
    cursor: q.cursor,
    size: q.size,
  });

  return reply.send(data);
}
