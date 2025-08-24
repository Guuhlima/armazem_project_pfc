'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export type Warehouse = { id: number; nome: string };

type ApiResponse = { warehouses: Warehouse[] };

export function useMyWarehouses() {
  const { isAuthenticated } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setWarehouses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse>('/estoques/me'); // precisa Authorization
      setWarehouses(res.data?.warehouses ?? []);
    } catch (err) {
      setError(err);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchData();
    })();
    return () => { mounted = false; };
  }, [fetchData]);

  const isLinked = (warehouses?.length ?? 0) > 0;
  const names = (warehouses ?? []).map(w => w.nome).join(', ');
  const first = (warehouses ?? [])[0];

  return {
    warehouses: warehouses ?? [],
    loading,
    error,
    refresh: fetchData,
    isLinked,
    names,
    first,
  };
}
