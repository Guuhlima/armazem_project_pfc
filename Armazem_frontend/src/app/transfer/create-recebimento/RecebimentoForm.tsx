'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/contexts/AuthContext';

type Estoque = { id: number; nome: string };

export default function RecebimentoForm() {
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [itemId, setItemId] = useState<number | ''>('');
  const [estoqueId, setEstoqueId] = useState<number | ''>('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [loteCodigo, setLoteCodigo] = useState('');
  const [validade, setValidade] = useState('');
  const [serialNumero, setSerialNumero] = useState('');
  const [loading, setLoading] = useState(false);

  const MySwal = withReactContent(Swal);
  const { hasPermission } = useAuth();

  useEffect(() => {
    (async () => {
      if (!hasPermission(['ADMIN', 'SUPER-ADMIN', 'USER-EQUIP-TRANSFER'])) return;
      try {
        const res = await api.get('/stock/visualizar');
        setEstoques(res.data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [hasPermission]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: any = {
        estoqueId: Number(estoqueId),
        itemId: Number(itemId),
        quantidade: Number(quantidade),
      };
      if (loteCodigo) body.loteCodigo = loteCodigo;
      if (validade) body.validade = validade;
      if (serialNumero) body.serialNumero = serialNumero;

      await api.post('/stock/receber', body);

      await MySwal.fire('Sucesso', 'Recebimento lançado com sucesso!', 'success');
      setQuantidade(''); setLoteCodigo(''); setValidade(''); setSerialNumero('');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Erro ao receber';
      MySwal.fire('Erro', msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Item ID</Label>
          <Input type="number" placeholder="ex: 10"
            value={itemId} onChange={(e)=>setItemId(e.target.value ? Number(e.target.value) : '')} />
        </div>
        <div>
          <Label>Estoque</Label>
          <select
            className="w-full border rounded px-3 py-2 mt-1 dark:bg-zinc-800 dark:border-zinc-700"
            value={estoqueId} onChange={(e)=>setEstoqueId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Selecione</option>
            {estoques.map(e => <option key={e.id} value={e.id}>{e.nome} (#{e.id})</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>Quantidade</Label>
        <Input type="number" placeholder="ex: 100"
          value={quantidade} onChange={(e)=>setQuantidade(e.target.value ? Number(e.target.value) : '')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Lote (opcional)</Label>
          <Input placeholder="ex: L-2026-01" value={loteCodigo} onChange={(e)=>setLoteCodigo(e.target.value)} />
        </div>
        <div>
          <Label>Validade (opcional)</Label>
          <Input type="date" value={validade} onChange={(e)=>setValidade(e.target.value)} />
        </div>
        <div>
          <Label>Serial (se item SERIAL)</Label>
          <Input placeholder="ex: SN-0001" value={serialNumero} onChange={(e)=>setSerialNumero(e.target.value)} />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Enviando...' : 'Lançar entrada'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Itens <b>LOTE</b> exigem <code>loteCodigo</code>; itens <b>SERIAL</b> exigem <code>serialNumero</code> (geralmente quantidade = 1).
      </p>
    </form>
  );
}