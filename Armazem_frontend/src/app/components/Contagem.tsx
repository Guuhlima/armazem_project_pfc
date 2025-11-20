'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTarefas as apiListarTarefas,
  iniciarTarefa as apiIniciar,
  lancarContagem as apiLancar,
  cancelarTarefa as apiCancelar,
  gerarContagemCiclica as apiGerarContagemCiclica, // 👈 NOVO
  type ContagemTarefa,
  type CountStatus,
} from '../../services/contagens';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const STATUS_OPTS: CountStatus[] = ['PENDING', 'IN_PROGRESS', 'RECOUNT_REQUIRED', 'CLOSED', 'CANCELED'];

function StatusBadge({ s }: { s: CountStatus }) {
  const map: Record<CountStatus, string> = {
    PENDING: 'secondary',
    IN_PROGRESS: 'default',
    RECOUNT_REQUIRED: 'destructive',
    CLOSED: 'outline',
    CANCELED: 'outline',
  };
  return <Badge variant={map[s] as any}>{s.replace('_', ' ')}</Badge>;
}

function formatDate(dt?: string | null) {
  if (!dt) return '-';
  return new Date(dt).toLocaleString();
}

export function Contagens({ userId, canGenerate }: { userId: number; canGenerate: boolean }) {
  const qc = useQueryClient();

  const [status, setStatus] = useState<CountStatus>('PENDING');
  const [q, setQ] = useState('');
  const [estoqueId, setEstoqueId] = useState<number | 'ALL'>('ALL');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ContagemTarefa[]>({
    queryKey: ['contagens', status, estoqueId],
    queryFn: () => apiListarTarefas(status),
    staleTime: 15_000,
  });

  const startMut = useMutation({
    mutationFn: (id: number) => apiIniciar(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contagens'] }),
    onError: (e: any) => alert(e?.message ?? 'Falha ao iniciar'),
  });

  const lancarMut = useMutation({
    mutationFn: ({ id, quantidade }: { id: number; quantidade: number }) => apiLancar(id, userId, quantidade),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contagens'] });
    },
    onError: (e: any) => alert(e?.message ?? 'Falha ao lançar contagem'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => apiCancelar(id, 'cancelado pela UI'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contagens'] }),
    onError: (e: any) => alert(e?.message ?? 'Falha ao cancelar'),
  });

  // 👇 NOVO: mutation pra gerar contagem cíclica
  const gerarMut = useMutation({
    mutationFn: () => apiGerarContagemCiclica(),
    onSuccess: (out) => {
      qc.invalidateQueries({ queryKey: ['contagens'] });
      alert(`Contagem cíclica gerada. Tarefas criadas: ${out?.criadas ?? 0}`);
    },
    onError: (e: any) => alert(e?.message ?? 'Falha ao gerar contagem cíclica'),
  });

  const rows = useMemo(() => {
    const r = data ?? [];
    if (!q.trim()) return r;
    const term = q.toLowerCase();
    return r.filter((t) =>
      [t.item?.nome ?? String(t.itemId), t.estoque?.nome ?? String(t.estoqueId)]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [data, q]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-9 w-full bg-muted rounded" />
          <div className="h-9 w-full bg-muted rounded" />
          <div className="h-9 w-3/4 bg-muted rounded" />
        </div>
      </Card>
    );
  }
  if (isError) {
    return (
      <Card className="p-4">
        <div className="text-destructive">Erro ao carregar: {(error as any)?.message ?? 'desconhecido'}</div>
        <Button className="mt-3" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-1">Buscar</label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Item, estoque..." />
        </div>
        <div className="w-56">
          <label className="text-xs text-muted-foreground block mb-1">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as CountStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Atualizando…' : 'Atualizar'}
          </Button>

          {canGenerate && (
            <Button
              variant="secondary"
              onClick={() => gerarMut.mutate()}
              disabled={gerarMut.isPending}
            >
              {gerarMut.isPending ? 'Gerando…' : 'Gerar contagem cíclica'}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>Item</th>
              <th>Estoque</th>
              <th>Vencimento</th>
              <th>Esperado</th>
              <th>Status</th>
              <th className="text-right pr-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Nenhuma tarefa encontrada para o filtro atual.
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2">{t.item?.nome ?? `Item #${t.itemId}`}</td>
                <td className="px-3 py-2">{t.estoque?.nome ?? `Estoque #${t.estoqueId}`}</td>
                <td className="px-3 py-2">{formatDate(t.dueAt)}</td>
                <td className="px-3 py-2">{t.systemQtyAtStart ?? '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge s={t.status as CountStatus} />
                    {t.bloquearMov && t.status === 'IN_PROGRESS' && (
                      <Badge variant="outline">🔒 movs bloqueadas</Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    {t.status === 'PENDING' && (
                      <Button size="sm" onClick={() => startMut.mutate(t.id)} disabled={startMut.isPending}>
                        Iniciar
                      </Button>
                    )}
                    {(t.status === 'IN_PROGRESS' || t.status === 'RECOUNT_REQUIRED') && (
                      <LancarDialog
                        tarefa={t}
                        onConfirm={(quant) => lancarMut.mutate({ id: t.id, quantidade: quant })}
                        busy={lancarMut.isPending}
                      />
                    )}
                    {(t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'RECOUNT_REQUIRED') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelMut.mutate(t.id)}
                        disabled={cancelMut.isPending}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LancarDialog({
  tarefa,
  onConfirm,
  busy,
}: {
  tarefa: ContagemTarefa;
  onConfirm: (quant: number) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [qtd, setQtd] = useState<number>(0);

  const isRecount = tarefa.status === 'RECOUNT_REQUIRED';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Lançar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar {isRecount ? 'reconte' : 'contagem'}</DialogTitle>
          <DialogDescription>
            Item: <b>{tarefa.item?.nome ?? `#${tarefa.itemId}`}</b> — Estoque:{' '}
            <b>{tarefa.estoque?.nome ?? `#${tarefa.estoqueId}`}</b>
            <br />
            Saldo esperado no início: <b>{tarefa.systemQtyAtStart ?? 0}</b>
            {typeof tarefa.toleranciaPct === 'number' && (
              <>
                {' '}
                — Tolerância: <b>{tarefa.toleranciaPct}%</b>
              </>
            )}
            {isRecount && (
              <>
                <br />
                <Badge variant="destructive">Reconte obrigatório por usuário diferente</Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-2">
          <label className="text-sm">Quantidade contada</label>
          <Input
            type="number"
            value={Number.isFinite(qtd) ? qtd : 0}
            onChange={(e) => setQtd(parseInt(e.target.value || '0', 10))}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(qtd);
              setOpen(false);
            }}
            disabled={busy || !Number.isFinite(qtd)}
          >
            {busy ? 'Salvando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
