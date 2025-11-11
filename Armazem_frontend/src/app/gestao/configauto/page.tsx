'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from 'app/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AutoReposicaoForm } from '../../components/AutoReposicaoForm';
import { AgendamentosTable } from '../../components/AgendamentosTable';
import { motion } from 'framer-motion';
import api from '@/services/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type Estoque = { id: number; nome: string };
type Equipamento = { id: number; nome: string };

function cssVar(name: string) {
  if (typeof window === 'undefined') return '';
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : '';
}

function useSwalTheme() {
  const theme = useMemo(() => ({
    background: cssVar('--card'),
    color: cssVar('--foreground'),
    confirmButtonColor: cssVar('--primary'),
    cancelButtonColor: cssVar('--muted-foreground'),
  }), []);
  const fire = (opts: any) =>
    Swal.fire({
      background: theme.background || undefined,
      color: theme.color || undefined,
      confirmButtonColor: theme.confirmButtonColor || undefined,
      ...opts,
      customClass: {
        popup: 'rounded-xl border border-border shadow-xl',
        confirmButton: 'rounded-md',
        cancelButton: 'rounded-md',
        ...(opts?.customClass || {}),
      },
    });
  return { fire };
}

export default function ReposicaoAutoPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [itens, setItens] = useState<Equipamento[]>([]);
  const [estoqueId, setEstoqueId] = useState<string>('');
  const [itemId, setItemId] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [runningPendentes, setRunningPendentes] = useState(false);
  const [runningPar, setRunningPar] = useState(false);
  const { fire } = useSwalTheme();

  const estoqueNome = (id?: number) =>
    estoques.find(e => e.id === id)?.nome ?? (id ? `Estoque #${id}` : '—');
  const itemNome = (id?: number) =>
    itens.find(i => i.id === id)?.nome ?? (id ? `Item #${id}` : '—');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/stock/visualizar');
        setEstoques(data as Estoque[]);
      } catch (e) {
        console.error('Falha ao listar estoques', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!estoqueId) {
        setItens([]);
        setItemId('');
        return;
      }
      try {
        const { data } = await api.get(`/stock/visualizar/${Number(estoqueId)}/itens`);
        const itensConvertidos: Equipamento[] = (data || []).map((r: any) => ({
          id: r.item.id,
          nome: r.item.nome,
        }));
        setItens(itensConvertidos);
        setItemId('');
      } catch (e) {
        console.error('Falha ao listar itens do estoque', e);
        setItens([]);
        setItemId('');
      }
    })();
  }, [estoqueId]);

  async function executarPendentes() {
    try {
      setRunningPendentes(true);
      const { data } = await api.post('/agendamentos/executar-pendentes', {});
      const count = data?.count ?? 0;
      await fire({
        icon: 'success',
        title: 'Execução finalizada',
        text: `Executados ${count} agendamentos com sucesso.`,
        confirmButtonText: 'Ok',
      });
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Falha ao executar pendentes';
      await fire({ icon: 'error', title: 'Erro', text: msg });
    } finally {
      setRunningPendentes(false);
    }
  }

  async function rodarAutoDoPar() {
    try {
      setRunningPar(true);
      if (!estoqueId || !itemId) {
        throw new Error('Selecione um estoque e um item.');
      }
      const destId = Number(estoqueId);
      const itId = Number(itemId);
      const { data } = await api.patch(`/estoques/${destId}/itens/${itId}/auto`, {});
      const result = data?.result ?? data ?? {};
      const created = !!result.created;
      const origemId: number | null = result.origemId ?? null;
      const quantidade: number | null = result.quantidade ?? null;
      const agendamentoId: number | null = result.agendamentoId ?? null;
      const reason: string | null = result.reason ?? null;

      if (created) {
        const html = `
          <div style="text-align:left">
            <div><b>Item:</b> ${itemNome(itId)} (ID ${itId})</div>
            <div><b>Origem:</b> ${estoqueNome(origemId ?? undefined)} (ID ${origemId ?? '—'})</div>
            <div><b>Destino:</b> ${estoqueNome(destId)} (ID ${destId})</div>
            <div><b>Quantidade:</b> ${quantidade}</div>
            <div><b>Agendamento #</b>${agendamentoId}</div>
          </div>`;
        await fire({ icon: 'success', title: 'Auto-reposição criada', html, confirmButtonText: 'Ok' });
      } else {
        const html = `
          <div style="text-align:left">
            <div><b>Item:</b> ${itemNome(itId)} (ID ${itId})</div>
            <div><b>Destino:</b> ${estoqueNome(destId)} (ID ${destId})</div>
            <div><b>Motivo:</b> ${reason ?? 'Nenhuma ação'}</div>
          </div>`;
        await fire({ icon: 'info', title: 'Sem criação de agendamento', html, confirmButtonText: 'Entendi' });
      }

      setRefreshKey(k => k + 1);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Falha ao rodar auto-reposição do par';
      await fire({ icon: 'error', title: 'Erro', text: msg });
    } finally {
      setRunningPar(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* grid neon de fundo (igual seu dashboard) */}
      <div
        className="fixed inset-0 z-0 animate-neon-grid"
        style={{
          backgroundColor: 'transparent',
          backgroundImage: `
            linear-gradient(rgba(200,200,200,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,200,200,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      >
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: `
              linear-gradient(rgba(29,78,216,0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(29,78,216,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            boxShadow: 'inset 0 0 100px 50px rgba(29,78,216,0.15)',
          }}
        />
      </div>

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
        onLogout={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }}
      />

      <main className={`relative z-10 transition-all duration-300 p-4 md:p-6 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-border dark:border-blue-800/50 bg-card/90 dark:bg-zinc-900/85 backdrop-blur-lg shadow-xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">Reabastecimento Interno Automático</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure as regras por <b>item × estoque</b> e acompanhe os agendamentos automáticos.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={executarPendentes}
                  disabled={runningPendentes}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {runningPendentes ? 'Executando…' : 'Executar pendentes'}
                </button>
                <button
                  onClick={rodarAutoDoPar}
                  disabled={runningPar || !estoqueId || !itemId}
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
            className="rounded-2xl border border-border dark:border-blue-800/40 bg-card/90 dark:bg-zinc-900/80 backdrop-blur-lg shadow-lg p-5 md:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estoque">Estoque</Label>
                <Select value={estoqueId} onValueChange={setEstoqueId}>
                  <SelectTrigger id="estoque" className="bg-background">
                    <SelectValue placeholder="Selecione um estoque" />
                  </SelectTrigger>
                  <SelectContent>
                    {estoques.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Estoque destino da regra.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item">Item</Label>
                <Select value={itemId} onValueChange={setItemId} disabled={!estoqueId || itens.length === 0}>
                  <SelectTrigger id="item" className="bg-background disabled:opacity-60">
                    <SelectValue placeholder={estoqueId ? 'Selecione um item' : 'Escolha um estoque primeiro'} />
                  </SelectTrigger>
                  <SelectContent>
                    {itens.map(i => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Item que terá auto-reposição.</p>
              </div>
            </div>
          </motion.div>

          {/* Form de Configuração */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="rounded-2xl border border-border dark:border-blue-800/40 bg-card/90 dark:bg-zinc-900/80 backdrop-blur-lg shadow-lg"
          >
            <Card className="border-0 bg-transparent">
              <CardContent className="p-5 md:p-6">
                <h3 className="text-lg font-semibold mb-2">Configuração por Item × Estoque</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina <b>mínimo</b>, <b>máximo</b>, <b>múltiplos</b> e <b>origem preferida</b>, além de ativar o modo automático.
                </p>
                <Separator className="my-4" />
                <div
                  className="
                    rounded-xl border border-border bg-muted/30 p-4 md:p-6
                    /* inputs/seleções/textarea internos seguem o tema */
                    [&_input]:w-full [&_select]:w-full [&_textarea]:w-full
                    [&_input]:rounded-md [&_select]:rounded-md [&_textarea]:rounded-md
                    [&_input]:border [&_select]:border [&_textarea]:border
                    [&_input]:border-border [&_select]:border-border [&_textarea]:border-border
                    [&_input]:bg-muted/15 [&_select]:bg-muted/15 [&_textarea]:bg-muted/15
                    [&_input]:text-foreground [&_select]:text-foreground [&_textarea]:text-foreground
                    [&_input::placeholder]:text-muted-foreground
                    [&_textarea::placeholder]:text-muted-foreground
                    [&_input:focus]:outline-none [&_select:focus]:outline-none [&_textarea:focus]:outline-none
                    [&_input:focus-visible]:ring-2 [&_select:focus-visible]:ring-2 [&_textarea:focus-visible]:ring-2
                    [&_input:focus-visible]:ring-ring [&_select:focus-visible]:ring-ring [&_textarea:focus-visible]:ring-ring
                    [&_input:focus-visible]:ring-offset-2 [&_select:focus-visible]:ring-offset-2 [&_textarea:focus-visible]:ring-offset-2
                    [&_input:focus-visible]:ring-offset-background
                    [&_select:focus-visible]:ring-offset-background
                    [&_textarea:focus-visible]:ring-offset-background
                    [&_input]:disabled:opacity-60 [&_select]:disabled:opacity-60 [&_textarea]:disabled:opacity-60
                    /* tira sombras/brancão default do select em alguns browsers */
                    [&_select]:appearance-none [&_input]:shadow-none [&_select]:shadow-none [&_textarea]:shadow-none
                  "
                >
                  <AutoReposicaoForm estoqueId={Number(estoqueId) || 0} itemId={Number(itemId) || 0} />
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
              className="rounded-2xl shadow-xl border border-border dark:border-blue-800/40 bg-card/90 dark:bg-zinc-900/80 backdrop-blur-lg overflow-hidden"
            >
              <AgendamentosTable refreshKey={refreshKey} />
            </motion.div>
          </section>
        </div>
      </main>
    </div>
  );
}
