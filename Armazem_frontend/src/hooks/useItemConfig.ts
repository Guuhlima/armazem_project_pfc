import { useEffect, useState } from 'react';
import { EstoqueItemConfig, getItemConfig, patchAutoRepo, meusEstoques, listarEstoquesDisponiveis, Warehouse } from '../services/repoauto';

export function useItemConfig(estoqueId: number, itemId: number) {
  const [cfg, setCfg] = useState<EstoqueItemConfig | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    (async () => {
      try {
        const [me, conf, out] = await Promise.all([
          meusEstoques(),
          getItemConfig(estoqueId, itemId),
          listarEstoquesDisponiveis().catch(() => []),
        ]);
        if (!live) return;
        const map = new Map<number, Warehouse>();
        [...me, ...out].forEach(w => map.set(w.id, w));
        setWarehouses(Array.from(map.values()));
        setCfg(conf);
      } catch (e:any) {
        if (!live) return;
        setError(e.message ?? 'Erro ao carregar');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [estoqueId, itemId]);

  async function save(partial: Partial<EstoqueItemConfig>) {
    if (!cfg) return;
    setSaving(true); setMsg(null); setError(null);
    try {
      const res = await patchAutoRepo(estoqueId, itemId, {
        autoAtivo: partial.autoAtivo ?? cfg.autoAtivo,
        minimo: partial.minimo ?? cfg.minimo ?? null,
        maximo: partial.maximo ?? cfg.maximo ?? null,
        multiplo: partial.multiplo ?? cfg.multiplo ?? null,
        origemPreferidaId: partial.origemPreferidaId ?? cfg.origemPreferidaId ?? null,
      });
      setCfg(res);
      setMsg('Configuração salva ✔');
    } catch (e:any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return { cfg, setCfg, warehouses, loading, saving, error, msg, save };
}