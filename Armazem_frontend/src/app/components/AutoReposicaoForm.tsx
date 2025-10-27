import React, { useMemo } from 'react';
import { useItemConfig } from '../../hooks/useItemConfig';

export function AutoReposicaoForm({ estoqueId, itemId }:{estoqueId:number; itemId:number}) {
  const { cfg, setCfg, warehouses, loading, saving, error, msg, save } = useItemConfig(estoqueId, itemId);

  const preview = useMemo(() => {
    if (!cfg) return null;
    const alvo = (cfg.maximo ?? cfg.minimo);
    let qtd = Math.max(0, alvo - (cfg.quantidade ?? 0));
    if (cfg.multiplo && cfg.multiplo > 1) qtd = Math.ceil(qtd / cfg.multiplo) * cfg.multiplo;
    return { alvo, sugerido: qtd };
  }, [cfg]);

  if (loading || !cfg) return <div>Carregando…</div>;

  return (
    <div style={{ border:'1px solid #eee', borderRadius:8, padding:16 }}>
      <h3 style={{ marginTop:0 }}>Reabastecimento automático</h3>
      {error && <p style={{ color:'crimson' }}>{error}</p>}
      {msg && <p style={{ color:'green' }}>{msg}</p>}

      <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(2, minmax(0,1fr))' }}>
        <label style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" checked={!!cfg.autoAtivo}
            onChange={e => setCfg?.({ ...cfg, autoAtivo: e.target.checked })}/>
          Ativar automação
        </label>

        <div>
          <label>Mínimo</label>
          <input type="number" value={cfg.minimo}
            onChange={e => setCfg?.({ ...cfg, minimo: Number(e.target.value) })}
            style={{ width:'100%' }} />
        </div>

        <div>
          <label>Máximo (alvo)</label>
          <input type="number" value={cfg.maximo ?? 0}
            onChange={e => setCfg?.({ ...cfg, maximo: Number(e.target.value) })}
            style={{ width:'100%' }} />
        </div>

        <div>
          <label>Múltiplo (embalagem)</label>
          <input type="number" value={cfg.multiplo ?? 1}
            onChange={e => setCfg?.({ ...cfg, multiplo: Number(e.target.value) || null })}
            style={{ width:'100%' }} />
        </div>

        <div>
          <label>Origem preferida</label>
          <select value={cfg.origemPreferidaId ?? ''}
            onChange={e => setCfg?.({ ...cfg, origemPreferidaId: e.target.value ? Number(e.target.value) : null })}
            style={{ width:'100%' }}>
            <option value="">— escolher —</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.nome} (#{w.id})</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop:12, padding:12, background:'#fafafa', borderRadius:6 }}>
        <strong>Simulação</strong>
        <div style={{ marginTop:6, fontSize:14 }}>
          Atual: <b>{cfg.quantidade}</b> | Mín.: <b>{cfg.minimo}</b> | Alvo: <b>{cfg.maximo ?? cfg.minimo}</b>
          {preview && <> | Sugerido (preview): <b>{preview.sugerido}</b></>}
        </div>
      </div>

      <button style={{ marginTop:12, padding:'8px 12px' }}
        disabled={saving}
        onClick={() => save(cfg)}>
        {saving ? 'Salvando…' : 'Salvar configurações'}
      </button>
    </div>
  );
}
