'use client';

import { useEffect, useMemo, useState } from 'react';
import { listAllStocks, requestAccessToStock, Warehouse } from '@/services/stock';
import Swal from 'sweetalert2'

type Props = {
  open: boolean;
  onClose: () => void;
  onRequested?: () => void;
  excludeIds?: number[];
};

export function RequestWarehouseModal({ open, onClose, onRequested, excludeIds = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<Warehouse[]>([]);
  const [estoqueId, setEstoqueId] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listAllStocks()
      .then((all) => setStocks(all))
      .finally(() => setLoading(false));
  }, [open]);

  const options = useMemo(
    () => stocks.filter(s => !excludeIds.includes(s.id)),
    [stocks, excludeIds]
  );

  const canSubmit = !!estoqueId && !submitting;

  const submit = async () => {
    if (!estoqueId) return;
    try {
      setSubmitting(true);
      await requestAccessToStock(Number(estoqueId), reason || undefined);
      onRequested?.();
      onClose();

      Swal.fire({
        icon: 'success',
        title: 'Sucesso',
        text: 'Solicitação enviada para aprovação do admin do armazém',
        timer: 1500
      })
      // Solicitação enviada para aprovação do admin do armazém;
      
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Erro ao solicitar acesso');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Solicitar acesso a armazém</h3>
          <button className="text-sm opacity-70 hover:opacity-100" onClick={onClose}>Fechar</button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
            <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
          </div>
        ) : options.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Não há armazéns disponíveis para solicitar (ou você já está vinculado a todos).
          </p>
        ) : (
          <>
            <label className="block text-sm mb-2">Selecione o armazém</label>
            <select
              className="w-full border rounded p-2 text-black mb-4"
              value={estoqueId}
              onChange={(e) => setEstoqueId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">— Selecione —</option>
              {options.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>

            <label className="block text-sm mb-2">Motivo (opcional)</label>
            <textarea
              className="w-full border rounded p-2 text-black mb-4"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Por que você precisa de acesso?"
            />

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-3 py-2 rounded border">Cancelar</button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {submitting ? 'Enviando…' : 'Enviar solicitação'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
