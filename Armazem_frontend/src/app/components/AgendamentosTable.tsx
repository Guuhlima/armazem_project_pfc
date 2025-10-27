import React, { useEffect, useMemo, useState } from 'react';
import { useAgendamentos } from '../../hooks/useAgendamento';
import { cancelAgendamento } from '../../services/repoauto';

const Badge = ({ s }: { s: string }) => {
  const color: Record<string,string> = {
    PENDING:'#b58900', EXECUTED:'#268bd2', DONE:'#2aa198', FAILED:'#dc322f', CANCELED:'#657b83'
  };
  return (
    <span
      style={{
        padding:'2px 6px',
        borderRadius:12,
        background:color[s]||'#777',
        color:'#fff',
        fontSize:12
      }}
    >
      {s}
    </span>
  );
};

interface AgendamentosTableProps {
  refreshKey?: number;
}

export function AgendamentosTable({ refreshKey }: AgendamentosTableProps) {
  const { data, loading, error, reload } = useAgendamentos();
  const [status, setStatus] = useState<'ALL'|'PENDING'|'EXECUTED'|'DONE'|'FAILED'|'CANCELED'>('ALL');
  const [origem, setOrigem] = useState<'ALL'|'AUTO'|'MANUAL'>('ALL');

  // loading por linha
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // quando o refreshKey mudar (vindo da página), recarrega
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const filtered = useMemo(
    () =>
      data.filter(
        (a) =>
          (status === 'ALL' || a.status === status) &&
          (origem === 'ALL' || (a.origemTipo ?? 'MANUAL') === origem)
      ),
    [data, status, origem]
  );

  async function cancel(id: number) {
    try {
      setCancelingId(id);
      await cancelAgendamento(id);
      reload();
    } catch (e: any) {
      alert(e?.message || 'Falha ao cancelar');
    } finally {
      setCancelingId(null);
    }
  }

  async function executar(id: number) {
    try {
      setExecutingId(id);
      const token = localStorage.getItem('token') || '';
      const API = process.env.NEXT_PUBLIC_API_URL!;
      const res = await fetch(`${API}/agendamentos/${id}/executar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao executar agendamento');
      // opcional: feedback
      alert(`Agendamento #${id} executado!`);
      reload();
    } catch (e: any) {
      alert(e?.message || 'Falha ao executar agendamento');
    } finally {
      setExecutingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="ALL">Todos status</option>
          <option>PENDING</option>
          <option>EXECUTED</option>
          <option>DONE</option>
          <option>FAILED</option>
          <option>CANCELED</option>
        </select>
        <select value={origem} onChange={(e) => setOrigem(e.target.value as any)}>
          <option value="ALL">Todas origens</option>
          <option value="AUTO">Automático</option>
          <option value="MANUAL">Manual</option>
        </select>
        <button onClick={reload} disabled={loading}>
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
        {error && <span style={{ color: 'crimson' }}>{error}</span>}
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#fafafa' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>#</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Item</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Origem → Destino</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Qtd</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Execução</th>
              <th style={{ textAlign: 'left', padding: 8 }}>OrigemTipo</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
              <th style={{ width: 220 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{a.id}</td>
                <td style={{ padding: 8 }}>#{a.itemId}</td>
                <td style={{ padding: 8 }}>
                  {a.estoqueOrigemId} → {a.estoqueDestinoId}
                </td>
                <td style={{ padding: 8 }}>{a.quantidade}</td>
                <td style={{ padding: 8 }}>{new Date(a.executarEm).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{a.origemTipo ?? 'MANUAL'}</td>
                <td style={{ padding: 8 }}>
                  <Badge s={a.status} />
                </td>
                <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                  {a.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => executar(a.id)}
                        disabled={executingId === a.id}
                        style={{ padding: '4px 8px' }}
                        title="Executa este agendamento agora"
                      >
                        {executingId === a.id ? 'Executando…' : 'Executar'}
                      </button>
                      <button
                        onClick={() => cancel(a.id)}
                        disabled={cancelingId === a.id}
                        style={{ padding: '4px 8px' }}
                        title="Cancela este agendamento"
                      >
                        {cancelingId === a.id ? 'Cancelando…' : 'Cancelar'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                  Sem agendamentos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
