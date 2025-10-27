'use client';

import React, { useState } from 'react';
import Sidebar from 'app/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AutoReposicaoForm } from '../../components/AutoReposicaoForm';
import { AgendamentosTable } from '../../components/AgendamentosTable';
import { motion } from 'framer-motion';
import api from '@/services/api';

export default function ReposicaoAutoPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [estoqueId, setEstoqueId] = useState<number>(1);
  const [itemId, setItemId] = useState<number>(1);

  // força a tabela recarregar após ações
  const [refreshKey, setRefreshKey] = useState(0);

  // loading flags
  const [runningPendentes, setRunningPendentes] = useState(false);
  const [runningPar, setRunningPar] = useState(false);

  async function executarPendentes() {
    try {
      setRunningPendentes(true);
      const { data } = await api.post('/agendamentos/executar-pendentes', {}); // <-- body {}
      alert(`Executados ${data?.count ?? 0} agendamentos com sucesso!`);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'Falha ao executar pendentes');
    } finally {
      setRunningPendentes(false);
    }
  }

  async function rodarAutoDoPar() {
    try {
      setRunningPar(true);
      if (!Number.isFinite(estoqueId) || !Number.isFinite(itemId)) {
        throw new Error('Informe estoqueId e itemId válidos.');
      }
      // usa o PATCH existente que já chama checarLimitesEGerenciarAlertas
      const { data } = await api.patch(`/estoques/${estoqueId}/itens/${itemId}/auto`, {});
      // se quiser mostrar algo, dá para chamar um GET de agendamentos depois
      alert(`Checagem disparada para estoque ${estoqueId} / item ${itemId}.`);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'Falha ao rodar auto-reposição do par');
    } finally {
      setRunningPar(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onLogout={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }}
      />

      <main
        className={`transition-all duration-300 p-4 md:p-6 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Reabastecimento Interno Automático</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure as regras por <b>item × estoque</b> e acompanhe os agendamentos automáticos.
                </p>
              </div>

              {/* Ações rápidas */}
              <div className="flex gap-2">
                <button
                  onClick={executarPendentes}
                  disabled={runningPendentes}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {runningPendentes ? 'Executando…' : 'Executar pendentes'}
                </button>
                <button
                  onClick={rodarAutoDoPar}
                  disabled={runningPar}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                  title="Força a checagem e criação de agendamento automático para o par selecionado"
                >
                  {runningPar ? 'Rodando…' : 'Rodar auto p/ (estoque×item)'}
                </button>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-border bg-card shadow-sm p-5 md:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estoqueId">Estoque</Label>
                <Input
                  id="estoqueId"
                  type="number"
                  inputMode="numeric"
                  value={estoqueId}
                  onChange={(e) => setEstoqueId(Number(e.target.value))}
                  placeholder="Ex.: 1"
                />
                <p className="text-xs text-muted-foreground">ID do estoque destino da regra.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemId">Item</Label>
                <Input
                  id="itemId"
                  type="number"
                  inputMode="numeric"
                  value={itemId}
                  onChange={(e) => setItemId(Number(e.target.value))}
                  placeholder="Ex.: 1"
                />
                <p className="text-xs text-muted-foreground">ID do item que terá auto-reposição.</p>
              </div>
            </div>
          </motion.div>

          {/* Form de Configuração */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="rounded-2xl border border-border bg-card shadow-sm"
          >
            <Card className="border-0 bg-transparent">
              <CardContent className="p-5 md:p-6">
                <h3 className="text-lg font-semibold mb-2">Configuração por Item × Estoque</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina <b>mínimo</b>, <b>máximo</b>, <b>múltiplos</b> e <b>origem preferida</b>, além de ativar o modo automático.
                </p>
                <Separator className="my-4" />
                <div className="rounded-xl border border-border bg-muted/30 p-4 md:p-6">
                  <AutoReposicaoForm estoqueId={estoqueId} itemId={itemId} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Agendamentos */}
          <section className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold">Agendamentos</h3>
              <p className="text-sm text-muted-foreground">
                Monitoramento de agendamentos <b>automáticos</b> e <b>manuais</b>. Você pode cancelar enquanto estiver <i>PENDING</i>.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.07 }}
              className="rounded-2xl shadow-sm border border-border bg-card overflow-hidden"
            >
              <AgendamentosTable refreshKey={refreshKey} />
            </motion.div>
          </section>
        </div>
      </main>
    </div>
  );
}
