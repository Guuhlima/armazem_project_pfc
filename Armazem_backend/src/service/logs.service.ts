import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { normalizeGranularity } from 'utils/utils'
import { Granularity, LogAction, LogType } from 'types/type'

// Função que chama uma query no banco para puxar as logs
export const LogService = {
  async timeSeries(params: {
    inicio: Date; fim: Date; granularity: Granularity;
    type?: LogType;
    action?: LogAction;
    success?: boolean;
    userId?: number;
    itemId?: number;
    estoqueId?: number;
    tz?: string;
  }) {
    const {
      inicio, fim,
      type, action, success,
      userId, itemId, estoqueId,
      tz = 'UTC'
    } = params

    const gran = normalizeGranularity(params.granularity)
    const dateTrunc =
      gran === 'hour' ? 'hour' :
      gran === 'day'  ? 'day'  :
      gran === 'week' ? 'week' : 'month'

    const rows = await prisma.$queryRaw<{ bucket: string; total: number }[]>(Prisma.sql`
      SELECT to_char(
               date_trunc(${dateTrunc}::text, "createdAt" AT TIME ZONE ${tz}),
               CASE
                 WHEN ${dateTrunc} = 'hour' THEN 'YYYY-MM-DD HH24:00'
                 WHEN ${dateTrunc} = 'day'  THEN 'YYYY-MM-DD'
                 WHEN ${dateTrunc} = 'week' THEN 'IYYY-"W"IW'
                 ELSE 'YYYY-MM'
               END
             ) AS bucket,
             COUNT(*)::int AS total
        FROM "public"."log_event"
       WHERE "createdAt" >= ${inicio}
         AND "createdAt" <  ${fim}
         ${type     ? Prisma.sql`AND "type"::text   = ${type}` : Prisma.empty}
         ${action   ? Prisma.sql`AND "action"::text = ${action}` : Prisma.empty}
         ${success !== undefined ? Prisma.sql`AND "success" = ${success}` : Prisma.empty}
         ${userId   ? Prisma.sql`AND "actorUserId" = ${userId}` : Prisma.empty}
         ${itemId   ? Prisma.sql`AND "itemId"      = ${itemId}` : Prisma.empty}
         ${estoqueId? Prisma.sql`AND "estoqueId"   = ${estoqueId}` : Prisma.empty}
       GROUP BY 1
       ORDER BY 1 ASC
    `)

    return rows
  },

  async topN(params: {
    inicio: Date; fim: Date;
    type?: LogType;
    action?: LogAction;
    field: 'route'|'actor'|'item'|'estoque'|'errorCode';
    limit?: number;
    success?: boolean;
  }) {
    const { inicio, fim, type, action, field, limit = 10, success } = params

    const selector =
      field === 'route'   ? Prisma.sql`"route"` :
      field === 'actor'   ? Prisma.sql`COALESCE("actorName", "actorUserId"::text)` :
      field === 'item'    ? Prisma.sql`"itemId"::text` :
      field === 'estoque' ? Prisma.sql`"estoqueId"::text` :
                            Prisma.sql`"errorCode"`

    const rows = await prisma.$queryRaw<{ key: string | null; total: number }[]>(Prisma.sql`
      SELECT ${selector} AS key, COUNT(*)::int AS total
        FROM "public"."log_event"
       WHERE "createdAt" >= ${inicio}
         AND "createdAt" <  ${fim}
         ${type     ? Prisma.sql`AND "type"::text   = ${type}` : Prisma.empty}
         ${action   ? Prisma.sql`AND "action"::text = ${action}` : Prisma.empty}
         ${success !== undefined ? Prisma.sql`AND "success" = ${success}` : Prisma.empty}
       GROUP BY 1
       ORDER BY 2 DESC NULLS LAST
       LIMIT ${limit}
    `)

    return rows
  },

  async list(params: {
    inicio: Date; fim: Date;
    type?: LogType;
    action?: LogAction;
    success?: boolean;
    q?: string;
    cursor?: string;
    size?: number;
  }) {
    const { inicio, fim, type, action, success, q, cursor, size = 50 } = params

    const where: Prisma.LogEventWhereInput = {
      createdAt: { gte: inicio, lt: fim },
      ...(type ? { type: type as any } : {}),
      ...(action ? { action: action as any } : {}),
      ...(success !== undefined ? { success } : {}),
      ...(q ? {
        OR: [
          { message:      { contains: q, mode: 'insensitive' } },
          { errorMessage: { contains: q, mode: 'insensitive' } },
          { route:        { contains: q, mode: 'insensitive' } },
        ]
      } : {})
    }

    const data = await prisma.logEvent.findMany({
      where,
      take: size,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' }
    })

    return { data, nextCursor: data.length === size ? data[data.length - 1].id : null }
  }
}
