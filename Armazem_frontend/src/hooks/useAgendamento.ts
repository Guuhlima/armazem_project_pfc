import { useEffect, useState } from 'react';
import { listarAgendamentos, Agendamento } from '../services/repoauto';

export function useAgendamentos(autoRefreshMs = 10000) {
  const [data, setData] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  async function load(signal?: AbortSignal) {
    try {
      setLoading(true);
      const list = await listarAgendamentos();
      if (signal?.aborted) return;
      setData(list);
      setError(null);
    } catch (e: any) {
      if (signal?.aborted) return;
      setError(e.message ?? 'Erro ao carregar');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    const t = setInterval(() => load(ac.signal), autoRefreshMs);
    return () => { ac.abort(); clearInterval(t); };
  }, [autoRefreshMs]);

  return { data, loading, error, reload: () => load() };
}