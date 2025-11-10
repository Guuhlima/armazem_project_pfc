// services/logs.ts
import { api } from '@/services/api';

export type Granularity = 'hour' | 'day' | 'week' | 'month'
export type LogType = 'ACCESS' | 'INVENTORY' | 'BOT'
export type LogAction =
  | 'LOGIN' | 'LOGOUT' | 'REQUEST'
  | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'MOVE' | 'TRANSFER'
  | 'MESSAGE_SENT' | 'MESSAGE_FAILED'

export type SeriesPoint = { bucket: string; total: number }
export type SeriesResponse = { data: SeriesPoint[] }
export type TopRow = { key: string | null; total: number }
export type TopResponse = { data: TopRow[] }
export type EventsRow = {
  id: string
  type: LogType
  action: LogAction
  success: boolean
  createdAt: string
  actorUserId?: number | null
  actorName?: string | null
  route?: string | null
  httpMethod?: string | null
  message?: string | null
  errorCode?: string | null
}
export type EventsResponse = { data: EventsRow[]; nextCursor?: string | null }

export async function fetchSeries(params: {
  inicio: string; fim: string; granularity: Granularity
  type?: LogType; action?: LogAction; success?: boolean
  userId?: number; itemId?: number; estoqueId?: number; tz?: string
}) {
  const { data } = await api.get<SeriesResponse>('/logs/visualizar/series', {
    params: { tz: 'America/Sao_Paulo', ...params },
    // withCredentials não é necessário aqui porque usamos Bearer via interceptor
  });
  return data;
}

export async function fetchTop(params: {
  inicio: string; fim: string; field: 'route'|'actor'|'item'|'estoque'|'errorCode'
  type?: LogType; action?: LogAction; success?: boolean; limit?: number
}) {
  const { data } = await api.get<TopResponse>('/logs/visualizar/top', { params });
  return data;
}

export async function fetchEvents(params: {
  inicio: string; fim: string; q?: string; type?: LogType; action?: LogAction; success?: boolean;
  cursor?: string; size?: number
}) {
  const { data } = await api.get<EventsResponse>('/logs/visualizar/eventos', { params });
  return data;
}
