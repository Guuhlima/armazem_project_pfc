import React, { useMemo } from 'react';
import { useItemConfig } from '../../../hooks/useItemConfig';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type Props = { estoqueId: number; itemId: number };

function toInt(v: string, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function AutoReposicaoForm({ estoqueId, itemId }: Props) {
  const { cfg, setCfg, warehouses, loading, saving, error, msg, save } =
    useItemConfig(estoqueId, itemId);

  const preview = useMemo(() => {
    if (!cfg) return null;

    const qtdAtual = safeNum(cfg.quantidade, 0);
    const min = safeNum(cfg.minimo, 0);
    const alvoBase = cfg.maximo == null ? min : safeNum(cfg.maximo, min);

    let sugerido = Math.max(0, alvoBase - qtdAtual);

    const m = cfg.multiplo == null ? null : safeNum(cfg.multiplo, 0);
    if (m && m > 1) {
      sugerido = Math.ceil(sugerido / m) * m;
    }

    return { alvo: alvoBase, sugerido };
  }, [cfg]);


  if (loading || !cfg) {
    return (
      <div className="rounded-xl border border-border bg-card/70 backdrop-blur p-4 text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  function safeNum(x: unknown, def = 0): number {
    const n = Number(x);
    return Number.isFinite(n) ? n : def;
  }
  function safePosIntOrNull(raw: string) {
    if (raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n >= 1 ? Math.floor(n) : 1;
  }
  function fmt(x: unknown): string {
    const n = Number(x);
    return Number.isFinite(n) ? String(n) : '—';
  }
  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Reabastecimento automático</h3>
          <p className="text-xs text-muted-foreground">Configure o alvo, múltiplos e a origem preferida.</p>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="autoAtivo"
            checked={!!cfg.autoAtivo}
            onCheckedChange={(v) => setCfg?.({ ...cfg, autoAtivo: !!v })}
          />
          <Label htmlFor="autoAtivo" className="cursor-pointer">Ativar automação</Label>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2">
          {error}
        </div>
      )}
      {msg && (
        <div className="text-sm rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 px-3 py-2">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="minimo">Mínimo</Label>
          <Input
            id="minimo"
            type="number"
            inputMode="numeric"
            value={String(cfg.minimo ?? 0)}
            onChange={(e) => setCfg?.({ ...cfg, minimo: safeNum(e.target.value, 0) })}
            className="bg-muted/15"
          />

        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maximo">Máximo (alvo)</Label>
          <Input
            id="maximo"
            type="number"
            inputMode="numeric"
            value={cfg.maximo == null ? '' : String(cfg.maximo)}
            onChange={(e) => {
              const raw = e.target.value;
              setCfg?.({ ...cfg, maximo: raw === '' ? null : safeNum(raw, 0) });
            }}
            placeholder="Deixe vazio para usar o mínimo como alvo"
            className="bg-muted/15"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="multiplo">Múltiplo (embalagem)</Label>
          <Input
            id="multiplo"
            type="number"
            inputMode="numeric"
            min={1}
            value={cfg.multiplo == null ? '' : String(cfg.multiplo)}
            onChange={(e) => setCfg?.({ ...cfg, multiplo: safePosIntOrNull(e.target.value) })}
            placeholder="ex.: 2, 5, 10…"
            className="bg-muted/15"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="origemPreferida">Origem preferida</Label>
          <Select
            value={cfg.origemPreferidaId != null ? String(cfg.origemPreferidaId) : undefined}
            onValueChange={(v) =>
              setCfg?.({
                ...cfg,
                origemPreferidaId: v === 'none' ? null : Number(v),
              })
            }
          >
            <SelectTrigger id="origemPreferida" className="bg-muted/15">
              <SelectValue placeholder="— escolher —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— sem preferência —</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.nome} (#{w.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-1" />

      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
        <div className="text-sm font-medium">Simulação</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Atual: <b className="text-foreground">{fmt(cfg.quantidade)}</b> &nbsp;|&nbsp; Mín.:{' '}
          <b className="text-foreground">{fmt(cfg.minimo)}</b> &nbsp;|&nbsp; Alvo:{' '}
          <b className="text-foreground">
            {cfg.maximo == null ? fmt(cfg.minimo) : fmt(cfg.maximo)}
          </b>
          {preview && (
            <>
              {' '}{'|'} Sugerido (preview): <b className="text-foreground">{fmt(preview.sugerido)}</b>
            </>
          )}
        </div>
      </div>

      <div className="pt-1">
        <Button
          onClick={() => save(cfg)}
          disabled={saving}
          className="min-w-[180px]"
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  );
}
