'use client';

import React, { useEffect, useMemo, useState } from 'react';
import withAuth from '../components/withAuth';
import api from '@/services/api';
import Sidebar from '../components/Sidebar';
import TableEquipamentos from '../components/TableEquipamentos';
import { Card, CardContent } from '@/components/ui/card';
import { PackageCheck, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMyWarehouses } from '@/hooks/useMyWarehouses';
import { useAuth } from '@/contexts/AuthContext';
import type { Equipamento } from '@/types/equipamento';
import { RequestWarehouseModal } from '../components/RequestWarehouseModal';

type BackendEquip = {
  id: number;
  nome?: string | null;
  equipamento?: string | null;
  quantidade?: number | null;
  data?: string | Date | null;
  warehouseId?: number | null; // útil no fallback
};

const Home = () => {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [openReq, setOpenReq] = useState(false);

  const router = useRouter();
  const { logout } = useAuth();

  const { loading, isLinked, names, refresh, warehouses } = useMyWarehouses();

  const linkedWarehouseIds = useMemo(
    () => (warehouses || []).map(w => w.id),
    [warehouses]
  );

  const warehousesParam = useMemo(
    () => linkedWarehouseIds.join(','),
    [linkedWarehouseIds]
  );

  useEffect(() => {
    (async () => {
      try {
        if (loading) return;

        if (!isLinked || linkedWarehouseIds.length === 0) {
          setEquipamentos([]);
          return;
        }

        const { data } = await api.get<BackendEquip[]>('/equipment/visualizar', {
          params: { warehouses: warehousesParam },
        });

        const filtered = (Array.isArray(data) ? data : []).filter(item =>
          item?.warehouseId == null
            ? true // se o back já filtrou, provavelmente nem vem esse campo
            : linkedWarehouseIds.includes(item.warehouseId!)
        );

        const normalized: Equipamento[] = filtered.map((e) => ({
          id: e.id,
          nome: (e.nome ?? e.equipamento ?? '—').toString(),
          quantidade: e.quantidade ?? 0,
          data:
            typeof e.data === 'string'
              ? e.data
              : e.data instanceof Date
              ? e.data.toISOString()
              : '',
        }));

        setEquipamentos(normalized);
      } catch (err) {
        console.error(err);
        setEquipamentos([]);
      }
    })();
  }, [loading, isLinked, warehousesParam, linkedWarehouseIds]);

  const handleCardClick = () => {
    if (isLinked) router.push('/estoque/acess');
    else setOpenReq(true);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white transition-colors">
      <Sidebar
        onLogout={logout}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      <main className={`transition-all duration-300 p-6 pt-4 space-y-6 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm text-zinc-500">Total Equipamentos</h3>
                <p className="text-2xl font-bold mt-1 text-blue-600">{equipamentos.length}</p>
              </div>
              <PackageCheck className="w-6 h-6 text-blue-500" />
            </CardContent>
          </Card>

          <Card
            onClick={() => router.push('/equipamento/create')}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow hover:cursor-pointer hover:shadow-lg transition"
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm text-zinc-500">Novo Equipamento</h3>
                <p className="text-2xl font-bold mt-1 text-green-500">Criar</p>
              </div>
              <Plus className="w-6 h-6 text-green-500" />
            </CardContent>
          </Card>

          <Card
            onClick={handleCardClick}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow hover:cursor-pointer hover:shadow-lg transition"
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm text-zinc-500">Armazém</h3>
                {loading ? (
                  <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
                ) : isLinked ? (
                  <p className="text-lg font-semibold truncate max-w-[16rem]" title={names}>
                    {names}
                  </p>
                ) : (
                  <>
                    <p className="text-lg font-semibold">Não vinculado a um armazem</p>
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenReq(true);
                      }}
                    >
                      Solicitar acesso a armazem
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Últimos Equipamentos</h2>
          {/* Evita “piscar” dados enquanto carrega os armazéns */}
          <TableEquipamentos data={loading ? [] : equipamentos} />
        </section>
      </main>

      <RequestWarehouseModal
        open={openReq}
        onClose={() => setOpenReq(false)}
        onRequested={() => {
          // após solicitar acesso, atualiza lista de armazéns vinculados
          refresh();
        }}
      />
    </div>
  );
};

export default withAuth(Home);
