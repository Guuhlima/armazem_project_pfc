'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, CalendarX, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/contexts/AuthContext';
import { useIsClient } from '@/hooks/useIsClient';

// Tipos e Estilos
interface Agendamento {
  id: number;
  itemId: number;
  estoqueOrigemId: number;
  estoqueDestinoId: number;
  quantidade: number;
  executarEm: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELED" | "FAILED";
  item?: { nome: string };
  estoqueOrigem?: { nome: string };
  estoqueDestino?: { nome: string };
  erroUltimaTentativa?: string | null;
  usuarioNome: string;
}

// Estilos dos Badges de Status 
const STATUS_STYLES: Record<Agendamento["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700/50",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-700/50",
  CANCELED: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/50",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-700/50",
};

const MySwal = withReactContent(Swal);

// Helper para formatar data
function formatarDataHora(dataStr: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short',
    }).format(new Date(dataStr));
  } catch { return 'Data inválida'; }
}

// Componente da Tabela
export function AgendamentosTable({ refreshKey }: { refreshKey: number }) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const isClient = useIsClient();

  // Função para recarregar os dados
  async function refreshAgendamentos() {
    setLoading(true);
    try {
      const res = await api.get("/agendamentos?include=item,estoqueOrigem,estoqueDestino");
      setAgendamentos(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Erro ao listar agendamentos", e);
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  }

  // Recarrega quando a 'refreshKey' ou 'isClient' mudam
  useEffect(() => {
    if (isClient) {
      refreshAgendamentos();
    }
  }, [refreshKey, isClient]);

  // Função para cancelar agendamento 
  async function cancelarAgendamento(id: number) {
    const isDarkMode = document.documentElement.classList.contains('dark');

    const result = await MySwal.fire({
      title: 'Tem certeza?',
      text: `Deseja realmente cancelar o agendamento ID: ${id}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar!',
      cancelButtonText: 'Não',
      confirmButtonColor: '#dc2626',
      background: isDarkMode ? '#0b0b0b' : '#fff',
      color: isDarkMode ? '#e5e7eb' : '#18181b',
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/agendamentos/${id}`);
      await refreshAgendamentos(); // Recarrega a lista
      MySwal.fire({
        icon: 'success', title: 'Cancelado',
        text: 'Agendamento cancelado com sucesso.',
        timer: 2000, showConfirmButton: false,
        background: isDarkMode ? '#0b0b0b' : '#fff',
        color: isDarkMode ? '#e5e7eb' : '#18181b',
      });
    } catch (e: any) {
      MySwal.fire({
        icon: 'error', title: 'Erro!',
        text: e?.response?.data?.error || "Erro ao cancelar agendamento",
        background: isDarkMode ? '#0b0b0b' : '#fff',
        color: isDarkMode ? '#e5e7eb' : '#18181b',
      });
    }
  }

  // Estado de Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground h-40">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Carregando agendamentos...</span>
      </div>
    );
  }

  // Estado Vazio
  if (agendamentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
        <CalendarX className="w-12 h-12 mb-2 text-primary/50" />
        <p className="font-medium">Nenhum agendamento encontrado</p>
        <p className="text-sm">Não há agendamentos pendentes ou executados recentemente.</p>
      </div>
    );
  }

  function showAlert(arg0: string, arg1: string, arg2: string): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="[&_tr]:border-b bg-muted/30 dark:bg-zinc-800/50">
          <tr className="border-b border-border dark:border-zinc-700/50">
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">ID</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Usuario</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Item</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Rota</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Qtd</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Executar Em</th>
            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
            {hasPermission('transfer:manage') &&
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Ações</th>
            }
          </tr>
        </thead>

        <tbody className="[&_tr:last-child]:border-0 divide-y divide-border dark:divide-zinc-800">
          {agendamentos.map((ag) => (
            <tr key={ag.id} className="hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors">
              <td className="px-4 py-3 align-middle font-mono text-xs text-muted-foreground">
                #{ag.id}
              </td>
              <td className="px-4 py-3 align-middle font-mono text-xs text-muted-foreground">
                {ag.usuarioNome}
              </td>
              <td className="px-4 py-3 align-middle font-medium text-foreground">
                {ag.item?.nome}
              </td>
              <td className="px-4 py-3 align-middle text-muted-foreground text-xs">
                {ag.estoqueOrigem?.nome ?? ag.estoqueOrigemId} → {ag.estoqueDestino?.nome ?? ag.estoqueDestinoId}
              </td>
              <td className="px-4 py-3 align-middle font-medium">{ag.quantidade}</td>
              <td className="px-4 py-3 align-middle text-muted-foreground">{formatarDataHora(ag.executarEm)}</td>
              <td className="px-4 py-3 align-middle">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[ag.status]}`}
                  title={ag.status === 'FAILED' ? ag.erroUltimaTentativa ?? 'Erro desconhecido' : ag.status}
                >
                  {ag.status}
                </span>
              </td>
              {hasPermission('transfer:manage') &&
                <td className="px-4 py-3 align-middle text-right space-x-2">
                  {ag.status === "PENDING" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelarAgendamento(ag.id)}
                      title="Cancelar Agendamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : (
                    ag.status === 'FAILED' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        title={ag.erroUltimaTentativa ?? 'Erro desconhecido'}
                        onClick={() => showAlert('Erro na Execução', ag.erroUltimaTentativa ?? 'Erro desconhecido', 'error')}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground px-2">N/A</span>
                    )
                  )}
                </td>
              }
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}