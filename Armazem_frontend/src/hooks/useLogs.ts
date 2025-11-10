// hooks/useLogs.ts
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchSeries, fetchTop, fetchEvents,
  Granularity, LogAction, LogType,
} from '@/services/logs'

export function useLogsSeries(params: {
  inicio: string; fim: string; granularity: Granularity; tz?: string
  type?: LogType; action?: LogAction; success?: boolean;
  userId?: number; itemId?: number; estoqueId?: number;
}) {
  return useQuery({
    queryKey: ['logs-series', params],
    queryFn: () => fetchSeries({ tz: 'America/Sao_Paulo', ...params }),
    refetchOnWindowFocus: false,
    staleTime: 0,
  })
}

export function useLogsTop(params: {
  inicio: string; fim: string; field: 'route'|'actor'|'item'|'estoque'|'errorCode'
  type?: LogType; action?: LogAction; success?: boolean; limit?: number;
}) {
  return useQuery({
    queryKey: ['logs-top', params],
    queryFn: () => fetchTop(params),
    refetchOnWindowFocus: false,
    staleTime: 0,
  })
}

export function useLogsEvents(params: {
  inicio: string; fim: string; q?: string; type?: LogType; action?: LogAction; success?: boolean; size?: number;
}) {
  return useInfiniteQuery({
    queryKey: ['logs-events', params],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchEvents({ ...params, cursor: pageParam, size: params.size ?? 50 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
    staleTime: 0,
  })
}
