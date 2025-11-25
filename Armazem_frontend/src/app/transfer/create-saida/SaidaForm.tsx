'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import api from '@/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/contexts/AuthContext';

type Estoque = { id: number; nome: string };
type SugLote = { lote_id: number; codigo: string; validade: string | null; saldo: number };
type ItemEstoque = { id: number; nome: string };

export default function SaidaForm() {
  const [tab, setTab] = useState<'FEFO' | 'SERIAL'>('FEFO');
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [itemId, setItemId] = useState<number | ''>('');
  const [estoqueId, setEstoqueId] = useState<number | ''>('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [sugestoes, setSugestoes] = useState<SugLote[]>([]);
  const [loading, setLoading] = useState(false);

  const [serialNumero, setSerialNumero] = useState('');
  const [loadingSerial, setLoadingSerial] = useState(false);

  // NEW: permitir considerar lotes vencidos
  const [permitirVencidos, setPermitirVencidos] = useState(false);

  const MySwal = withReactContent(Swal);
  const { hasPermission } = useAuth();

  const hojeYmd = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isVencido = (validade?: string | null) => {
    if (!validade) return false;
    const d = new Date(validade); d.setHours(0,0,0,0);
    return d < hojeYmd();
  };

  // Carrega estoques
  useEffect(() => {
    (async () => {
      if (!hasPermission(['ADMIN', 'SUPER-ADMIN', 'USER-EQUIP-TRANSFER'])) return;
      try {
        const res = await api.get('/stock/visualizar');
        setEstoques(res.data);
      } catch (e) { console.error(e); }
    })();
  }, [hasPermission]);

  // Carrega itens do estoque selecionado
  useEffect(() => {
    if (!estoqueId) {
      setItens([]);
      setItemId('');
      return;
    }
    (async () => {
      try {
        const response = await api.get(`/stockmovi/visualizar/${estoqueId}/itens`);
        console.log('DEBUG resposta itens:', response.data);

        const itensNormalizados: ItemEstoque[] = (response.data || [])
          .map((row: any) => ({
            id: row.itemId ?? row.item?.id,
            nome: row.item?.nome ?? `Item #${row.itemId ?? '—'}`,
          }))
          .filter((i: ItemEstoque) => Number.isFinite(i.id));

        setItens(itensNormalizados);
      } catch (err) {
        console.error(err);
        setItens([]);
        setItemId('');
      }
    })();
  }, [estoqueId]);

  // FEFO: buscar sugestões
  async function carregarSugestoes() {
    if (!itemId || !estoqueId) return setSugestoes([]);
    try {
      const res = await api.get('/stock/sugerir-fefo', {
        params: { itemId: Number(itemId), estoqueId: Number(estoqueId), take: 50 }
      });

      console.log('DEBUG sugerir-fefo bruto:', res.data);

      const arr: any[] = Array.isArray(res.data) ? res.data : [];
      const normalizadas: SugLote[] = arr
        .map((l: any) => {
          const rawCodigo =
            l.codigo ?? l.code ?? l.loteCodigo ?? l.lote?.codigo ?? `L${l.lote_id ?? l.loteId ?? l.id ?? '—'}`;
          const codigo = String(rawCodigo).replace(/^"+|"+$/g, ''); // remove aspas extras

          return {
            lote_id: Number(l.lote_id ?? l.loteId ?? l.id ?? l.lote?.id ?? l.lote?.loteId ?? 0),
            codigo,
            validade: (l.validade ?? l.expiraEm ?? l.validade_at ?? l.data_validade ?? l.lote?.validade ?? null) || null,
            saldo: Number(l.saldo ?? l.qtd ?? l.quantidade ?? l.restante ?? 0),
          } as SugLote;
        })
        .filter((x: SugLote) => Number.isFinite(x.lote_id) && x.lote_id > 0);

      console.log('DEBUG sugerir-fefo normalizado:', normalizadas);
      setSugestoes(normalizadas);
    } catch (e) {
      console.error('Erro ao sugerir FEFO:', e);
      setSugestoes([]);
    }
  }

  useEffect(() => { carregarSugestoes(); }, [itemId, estoqueId]);

  // Conjuntos (válidos vs considerados)
  const sugestoesValidas = useMemo(
    () => (sugestoes || []).filter(l => !isVencido(l.validade)),
    [sugestoes]
  );
  const sugestoesConsideradas = useMemo(
    () => (permitirVencidos ? (sugestoes || []) : sugestoesValidas),
    [permitirVencidos, sugestoes, sugestoesValidas]
  );

  // Totais
  const totalDisp = useMemo(
    () => (sugestoesConsideradas || []).reduce((s, x) => s + Number(x.saldo || 0), 0),
    [sugestoesConsideradas]
  );
  const totalIncluindoVencidos = useMemo(
    () => (sugestoes || []).reduce((s, x) => s + Number(x.saldo || 0), 0),
    [sugestoes]
  );

  // Preview (distribuição FEFO sobre as consideradas)
  const preview = useMemo(() => {
    let restante = Number(quantidade || 0);
    return (sugestoesConsideradas || []).map(l => {
      const saldo = Number(l.saldo || 0);
      const usar = Math.max(0, Math.min(saldo, restante));
      restante -= usar;
      return { ...l, usar };
    });
  }, [sugestoesConsideradas, quantidade]);

  const podeEnviarFEFO = Boolean(
    itemId && estoqueId && quantidade && Number(quantidade) > 0 && Number(quantidade) <= totalDisp
  );

  // Mapa de metadados
  const mapLote = useMemo(() => {
    const m = new Map<number, { codigo: string; validade: string | null }>();
    sugestoes.forEach(l => m.set(l.lote_id, { codigo: l.codigo, validade: l.validade }));
    return m;
  }, [sugestoes]);

  // Submit FEFO
  async function onSubmitFEFO(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviarFEFO) return;

    // se vai usar vencidos, confirmar
    if (permitirVencidos) {
      const vaiUsarVencidos = preview.some(p => p.usar > 0 && isVencido(p.validade));
      if (vaiUsarVencidos) {
        const { isConfirmed } = await MySwal.fire({
          icon: 'warning',
          title: 'Usar lotes vencidos?',
          html: 'Você habilitou o uso de lotes vencidos e parte da quantidade será debitada deles.',
          showCancelButton: true,
          confirmButtonText: 'Confirmar',
          cancelButtonText: 'Cancelar'
        });
        if (!isConfirmed) return;
      }
    }

    setLoading(true);
    try {
      const body: any = {
        itemId: Number(itemId),
        estoqueId: Number(estoqueId),
        quantidadeSolicitada: Number(quantidade),
        referencia: { tabela: 'pedido_saida', id: undefined as number | undefined }
      };
      if (permitirVencidos) body.permitirVencidos = true; // opcional, se o back aceitar

      const res = await api.post('/stock/picking-fefo', body);

      const detalhes = (res.data?.lotes ?? [])
        .map((l: any) => {
          const meta = mapLote.get(Number(l.loteId ?? l.lote_id ?? l.id));
          const cod = meta?.codigo ?? `#${l.loteId ?? l.lote_id ?? l.id}`;
          return `Lote ${cod}: -${l.qtd ?? l.saldo ?? l.quantidade ?? '—'}`;
        })
        .join('<br/>') || '—';

      await MySwal.fire({ icon: 'success', title: 'Saída realizada', html: `Foram debitados:<br/>${detalhes}` });
      setQuantidade('');
      carregarSugestoes();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Erro ao gerar saída FEFO';
      MySwal.fire('Erro', msg, 'error');
    } finally { setLoading(false); }
  }

  // Submit SERIAL
  async function onSubmitSerial(e: React.FormEvent) {
    e.preventDefault();
    setLoadingSerial(true);
    try {
      if (!itemId || !estoqueId || !serialNumero) throw new Error('Preencha item, estoque e serial');
      const body = {
        itemId: Number(itemId),
        estoqueId: Number(estoqueId),
        serialNumero,
        referencia: { tabela: 'pedido_saida', id: undefined as number | undefined }
      };
      const res = await api.post('/stock/saida-serial', body);
      await MySwal.fire('Sucesso', `Serial ${serialNumero} saiu (id ${res.data?.serialId ?? '—'})`, 'success');
      setSerialNumero('');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Erro na saída por serial';
      MySwal.fire('Erro', msg, 'error');
    } finally { setLoadingSerial(false); }
  }

  // UI
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button type="button" variant={tab === 'FEFO' ? 'default' : 'outline'} onClick={() => setTab('FEFO')}>Saída FEFO (LOTE)</Button>
        <Button type="button" variant={tab === 'SERIAL' ? 'default' : 'outline'} onClick={() => setTab('SERIAL')}>Saída por SERIAL</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Item</Label>
          <select
            className="w-full border rounded px-3 py-2 mt-1 dark:bg-zinc-800 dark:border-zinc-700"
            value={itemId}
            onChange={e => setItemId(e.target.value ? Number(e.target.value) : '')}
            disabled={!estoqueId || itens.length === 0}
          >
            <option value="">
              {!estoqueId
                ? 'Selecione primeiro o estoque'
                : itens.length === 0
                  ? 'Nenhum item neste estoque'
                  : 'Selecione um item'}
            </option>
            {itens.map((i: ItemEstoque) => (
              <option key={i.id} value={i.id}>
                {i.nome} (#{i.id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Estoque</Label>
          <select
            className="w-full border rounded px-3 py-2 mt-1 dark:bg-zinc-800 dark:border-zinc-700"
            value={estoqueId}
            onChange={e => setEstoqueId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Selecione</option>
            {estoques.map((e: Estoque) => (
              <option key={e.id} value={e.id}>
                {e.nome} (#{e.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {tab === 'FEFO' ? (
        <form onSubmit={onSubmitFEFO} className="space-y-4">
          <div>
            <Label>Quantidade a retirar</Label>
            <Input
              type="number"
              placeholder="ex: 25"
              value={quantidade}
              onChange={e => setQuantidade(e.target.value ? Number(e.target.value) : '')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Disponível (considerando validade{permitirVencidos ? ' — overrides habilitado' : ''}): <b>{totalDisp}</b>
              {totalIncluindoVencidos !== totalDisp && (
                <> • Incluindo vencidos: <b>{totalIncluindoVencidos}</b></>
              )}
            </p>

            {/* Toggle permitir vencidos (aparece se houver vencidos) */}
            {(sugestoes.some(s => isVencido(s.validade))) && (
              <label className="mt-2 inline-flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="accent-rose-600"
                  checked={permitirVencidos}
                  onChange={(e) => setPermitirVencidos(e.target.checked)}
                />
                <span>
                  Permitir usar lotes <b>vencidos</b> (com confirmação)
                </span>
              </label>
            )}
          </div>

          {(preview.length > 0 || sugestoes.length > 0) && (
            <div className="rounded border p-3">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                Lotes sugeridos (ordem FEFO)
                <Button type="button" size="sm" variant="outline" onClick={carregarSugestoes}>Atualizar</Button>
              </div>

              {/* Cabeçalho */}
              <div className="grid grid-cols-5 gap-2 text-xs font-mono">
                <div className="font-semibold">Lote</div>
                <div className="font-semibold">Validade</div>
                <div className="font-semibold">Saldo</div>
                <div className="font-semibold">Será usado?</div>
                <div className="font-semibold">Status</div>

                {/* Linhas: preview com válidos + (se habilitado) vencidos integrados */}
                {preview.map((l) => {
                  const venc = l.validade ? new Date(l.validade).toLocaleDateString('pt-BR') : '—';
                  const vencido = isVencido(l.validade);
                  const statusBadge = vencido ? (
                    <span className="inline-flex items-center rounded px-2 py-[1px] text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">
                      {l.usar > 0 ? 'vencido (usará)' : 'vencido'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded px-2 py-[1px] text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                      válido
                    </span>
                  );

                  return (
                    <Fragment key={`row-${l.lote_id}`}>
                      <div className={vencido ? 'opacity-70' : ''}>{l.codigo} (#{l.lote_id})</div>
                      <div className={vencido ? 'opacity-70' : ''}>{venc}</div>
                      <div className={vencido ? 'opacity-70' : ''}>{l.saldo}</div>
                      <div className={vencido ? 'opacity-70' : ''}>{l.usar > 0 ? `~${l.usar}` : '—'}</div>
                      <div>{statusBadge}</div>
                    </Fragment>
                  );
                })}

                {/* Se o toggle estiver OFF, mostrar vencidos “somente visual” */}
                {!permitirVencidos && sugestoes
                  .filter(l => isVencido(l.validade))
                  .map((l) => {
                    const venc = l.validade ? new Date(l.validade).toLocaleDateString('pt-BR') : '—';
                    return (
                      <Fragment key={`venc-${l.lote_id}`}>
                        <div className="opacity-60">{l.codigo} (#{l.lote_id})</div>
                        <div className="opacity-60">{venc}</div>
                        <div className="opacity-60">{l.saldo}</div>
                        <div className="opacity-60">—</div>
                        <div>
                          <span className="inline-flex items-center rounded px-2 py-[1px] text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">
                            vencido
                          </span>
                        </div>
                      </Fragment>
                    );
                  })}
              </div>

              <p className="text-[11px] text-muted-foreground mt-2">
                A escolha final é feita no servidor (pickingFEFO).
                {permitirVencidos
                  ? ' Você habilitou o uso de lotes vencidos — confirme no envio.'
                  : ' Lotes vencidos são ignorados no cálculo e no envio.'}
              </p>
            </div>
          )}

          <Button type="submit" disabled={loading || !podeEnviarFEFO} className="w-full">
            {loading ? 'Gerando saída...' : 'Gerar saída FEFO'}
          </Button>
          {!podeEnviarFEFO && Number(quantidade || 0) > 0 && (
            <p className="text-xs text-red-500 mt-1">
              Quantidade solicitada maior que a disponível {permitirVencidos ? '(com overrides)' : '(considerando validade)'}.
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={onSubmitSerial} className="space-y-4">
          <div>
            <Label>Serial</Label>
            <Input placeholder="ex: SN-0001" value={serialNumero} onChange={e => setSerialNumero(e.target.value)} />
          </div>
          <Button type="submit" disabled={loadingSerial || !itemId || !estoqueId || !serialNumero} className="w-full">
            {loadingSerial ? 'Gerando saída...' : 'Gerar saída por SERIAL'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Para itens SERIAL, FEFO não se aplica. O back valida disponibilidade e validade do lote do serial (se houver).
          </p>
        </form>
      )}
    </div>
  );
}
