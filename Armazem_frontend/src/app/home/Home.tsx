'use client';

import React, { useEffect, useMemo, useState } from 'react';
import withAuth from '../components/withAuth';
import api from '@/services/api';
import Sidebar from '../components/Sidebar';
import TableEquipamentos from '../components/TableEquipamentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; 
import { PackageCheck, Plus, Warehouse } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import { useMyWarehouses } from '@/hooks/useMyWarehouses';
import { useAuth } from '@/contexts/AuthContext';
import type { Equipamento } from '@/types/equipamento';
import { RequestWarehouseModal } from '../components/RequestWarehouseModal';
import { Separator } from '@/components/ui/separator'; 

type BackendEquip = {
  id: number;
  nome?: string | null;
  equipamento?: string | null;
  quantidade?: number | null;
  data?: string | Date | null;
  warehouseId?: number | null;
};

const Home = () => {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [openReq, setOpenReq] = useState(false);

  const router = useRouter();
  const { logout, user } = useAuth(); // Pegar 'user' para mostrar o nome do usuário
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
            ? true
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

  const userName = user?.nome?.split(' ')[0] ?? 'Usuário'; // Pega o primeiro nome do usuário

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-100 dark:bg-zinc-950 transition-colors">

      <div
        className="absolute inset-0 z-0 animate-pan-wireframe"
        style={{
          backgroundColor: 'transparent',
          backgroundImage: `
            repeating-linear-gradient(45deg,
              rgba(59, 130, 246, 0.15) 0, rgba(59, 130, 246, 0.15) 1px,
              transparent 1px, transparent 30px
            ),
            repeating-linear-gradient(-45deg,
              rgba(59, 130, 246, 0.15) 0, rgba(59, 130, 246, 0.15) 1px,
              transparent 1px, transparent 30px
            )
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10">
        <Sidebar
          onLogout={logout}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />

        <main className={`transition-all duration-300 p-6 pt-4 space-y-8 ${collapsed ? 'ml-16' : 'ml-60'}`}> 

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Olá, {userName}! Visão geral do seu inventário.
            </p>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-700/50" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"> 

            <Card className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm border border-blue-500/10 dark:border-blue-500/20 shadow-sm hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-300 relative z-10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Itens</CardTitle>
                <PackageCheck className="w-5 h-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{equipamentos.length}</div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Equipamentos registrados</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push('/equipamento/create')}
              className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm border border-blue-500/10 dark:border-blue-500/20 shadow-sm hover:shadow-green-500/10 hover:border-green-500/30 transition-all duration-300 relative z-10 cursor-pointer group" 
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Novo Equipamento</CardTitle>
                <Plus className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-500">Adicionar</div>
              </CardContent>
            </Card>

            <Card
              onClick={handleCardClick}
              className={`bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm border border-blue-500/10 dark:border-blue-500/20 shadow-sm relative z-10 transition-all duration-300 ${isLinked ? 'hover:shadow-blue-500/10 hover:border-blue-500/30 cursor-pointer' : ''}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Meu Armazém</CardTitle>
                <Warehouse className="w-5 h-5 text-zinc-500 dark:text-zinc-400"/>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-6 w-full bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded mt-1" />
                ) : isLinked ? (
                  <>
                    <div className="text-xl font-semibold truncate text-zinc-900 dark:text-zinc-100" title={names}>
                      {names}
                    </div>
                     <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Clique para ver detalhes</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">Não Vinculado</div>
                    <button
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenReq(true);
                      }}
                    >
                      Solicitar acesso
                    </button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-700/50" />

          <section className="relative z-10">
            <h2 className="text-xl font-semibold mb-4 tracking-tight text-zinc-900 dark:text-zinc-100">Inventário Rápido</h2>
            <Card className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm border border-blue-500/10 dark:border-blue-500/20 shadow-sm">
                <CardContent className="p-0"> 
                    <TableEquipamentos data={loading ? [] : equipamentos} />
                </CardContent>
            </Card>
          </section>
        </main>
      </div>

      <RequestWarehouseModal
        open={openReq}
        onClose={() => setOpenReq(false)}
        onRequested={refresh}
      />
    </div>
  );
};

export default withAuth(Home);