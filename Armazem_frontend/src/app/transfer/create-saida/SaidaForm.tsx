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

export default function SaidaForm() {
  const [tab, setTab] = useState<'FEFO'|'SERIAL'>('FEFO');
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [itemId, setItemId] = useState<number | ''>('');
  const [estoqueId, setEstoqueId] = useState<number | ''>('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [sugestoes, setSugestoes] = useState<SugLote[]>([]);
  const [loading, setLoading] = useState(false);

  const [serialNumero, setSerialNumero] = useState('');
  const [loadingSerial, setLoadingSerial] = useState(false);

  const MySwal = withReactContent(Swal);
  const { hasPermission } = useAuth();

  useEffect(() => {
    (async () => {
      if (!hasPermission(['ADMIN', 'SUPER-ADMIN', 'USER-EQUIP-TRANSFER'])) return;
      try {
        const res = await api.get('/stock/visualizar');
        setEstoques(res.data);
      } catch (e) { console.error(e); }
    })();
  }, [hasPermission]);

  // --- Preview FEFO (igual ao back): ignora vencidos, caminha em ordem e calcula "usar" ---
  const hojeYmd = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

  async function carregarSugestoes() {
    if (!itemId || !estoqueId) return setSugestoes([]);
    try {
      const res = await api.get('/stock/sugerir-fefo', {
        params: { itemId: Number(itemId), estoqueId: Number(estoqueId), take: 50 }
      });
      setSugestoes(res.data as SugLote[]);
    } catch {
      setSugestoes([]);
    }
  }

  useEffect(() => { carregarSugestoes(); }, [itemId, estoqueId]);

  const preview = useMemo(() => {
    let restante = Number(quantidade || 0);
    const hoje = hojeYmd();
    return (sugestoes || [])
      .filter(l => {
        if (!l.validade) return true;               // NULLS LAST no back
        const v = new Date(l.validade); v.setHours(0,0,0,0);
        return v >= hoje;                            // espelha assertValidadeOk
      })
      .map(l => {
        const saldo = Number(l.saldo);
        const usar = Math.max(0, Math.min(saldo, restante));
        restante -= usar;
        return { ...l, usar };
      });
  }, [sugestoes, quantidade]);

  const totalDisp = useMemo(
    () => preview.reduce((s, x) => s + Number(x.saldo), 0),
    [preview]
  );

  const podeEnviarFEFO = Boolean(
    itemId && estoqueId && quantidade && Number(quantidade) > 0 && Number(quantidade) <= totalDisp
  );

  // Mapa para mostrar código dos lotes no popup
  const mapLote = useMemo(() => {
    const m = new Map<number, { codigo: string; validade: string | null }>();
    sugestoes.forEach(l => m.set(l.lote_id, { codigo: l.codigo, validade: l.validade }));
    return m;
  }, [sugestoes]);

  // --- Submits ---
  async function onSubmitFEFO(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviarFEFO) return;
    setLoading(true);
    try {
      const body = {
        itemId: Number(itemId),
        estoqueId: Number(estoqueId),
        quantidadeSolicitada: Number(quantidade),
        referencia: { tabela: 'pedido_saida', id: undefined as number | undefined }
      };
      const res = await api.post('/stock/picking-fefo', body);
      const detalhes = (res.data?.lotes ?? [])
        .map((l: any) => {
          const meta = mapLote.get(l.loteId);
          const cod = meta?.codigo ?? `#${l.loteId}`;
          return `Lote ${cod}: -${l.qtd}`;
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

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button type="button" variant={tab==='FEFO'?'default':'outline'} onClick={()=>setTab('FEFO')}>Saída FEFO (LOTE)</Button>
        <Button type="button" variant={tab==='SERIAL'?'default':'outline'} onClick={()=>setTab('SERIAL')}>Saída por SERIAL</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Item ID</Label>
          <Input type="number" placeholder="ex: 10"
            value={itemId} onChange={e=>setItemId(e.target.value ? Number(e.target.value) : '')} />
        </div>
        <div>
          <Label>Estoque</Label>
          <select
            className="w-full border rounded px-3 py-2 mt-1 dark:bg-zinc-800 dark:border-zinc-700"
            value={estoqueId} onChange={e=>setEstoqueId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Selecione</option>
            {estoques.map(e => <option key={e.id} value={e.id}>{e.nome} (#{e.id})</option>)}
          </select>
        </div>
      </div>

      {tab === 'FEFO' ? (
        <form onSubmit={onSubmitFEFO} className="space-y-4">
          <div>
            <Label>Quantidade a retirar</Label>
            <Input type="number" placeholder="ex: 25"
              value={quantidade} onChange={e=>setQuantidade(e.target.value ? Number(e.target.value) : '')} />
            <p className="text-xs text-muted-foreground mt-1">
              Disponível (considerando validade): <b>{totalDisp}</b>
            </p>
          </div>

          {preview.length > 0 && (
            <div className="rounded border p-3">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                Lotes sugeridos (ordem FEFO)
                <Button type="button" size="sm" variant="outline" onClick={carregarSugestoes}>Atualizar</Button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                <div className="font-semibold">Lote</div>
                <div className="font-semibold">Validade</div>
                <div className="font-semibold">Saldo</div>
                <div className="font-semibold">Será usado?</div>
                {preview.map(l => {
                  const venc = l.validade
                    ? new Date(l.validade).toLocaleDateString('pt-BR')
                    : '—';
                  return (
                    <Fragment key={l.lote_id}>
                      <div>{l.codigo} (#{l.lote_id})</div>
                      <div>{venc}</div>
                      <div>{l.saldo}</div>
                      <div>{l.usar > 0 ? `~${l.usar}` : '—'}</div>
                    </Fragment>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                A escolha final é feita no servidor (pickingFEFO). Lotes vencidos são ignorados.
              </p>
            </div>
          )}

          <Button type="submit" disabled={loading || !podeEnviarFEFO} className="w-full">
            {loading ? 'Gerando saída...' : 'Gerar saída FEFO'}
          </Button>
          {!podeEnviarFEFO && Number(quantidade||0) > 0 && (
            <p className="text-xs text-red-500 mt-1">
              Quantidade solicitada maior que a disponível (considerando validade).
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={onSubmitSerial} className="space-y-4">
          <div>
            <Label>Serial</Label>
            <Input placeholder="ex: SN-0001" value={serialNumero} onChange={e=>setSerialNumero(e.target.value)} />
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