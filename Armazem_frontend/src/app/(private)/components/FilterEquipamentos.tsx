'use client';

import React from 'react';

export type Filters = {
  nome?: string;
  qntMin?: number | '';
  qntMax?: number | '';
  dataIni?: string; // yyyy-mm-dd
  dataFim?: string; // yyyy-mm-dd
};

type Props = {
  nomesDisponiveis: string[];
  value: Filters;
  onChange: (next: Filters) => void;
  onClear?: () => void;
};

export const FilterEquipamentos: React.FC<Props> = ({
  nomesDisponiveis,
  value,
  onChange,
  onClear,
}) => {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="flex flex-col">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Equipamento</label>
        <select
          value={value.nome ?? ''}
          onChange={(e) => set({ nome: e.target.value || undefined })}
          className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm"
        >
          <option value="">Todos</option>
          {nomesDisponiveis.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Quant. mín.</label>
        <input
          type="number"
          inputMode="numeric"
          value={value.qntMin ?? ''}
          onChange={(e) => set({ qntMin: e.target.value === '' ? '' : Number(e.target.value) })}
          className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm"
          placeholder="0"
          min={0}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Quant. máx.</label>
        <input
          type="number"
          inputMode="numeric"
          value={value.qntMax ?? ''}
          onChange={(e) => set({ qntMax: e.target.value === '' ? '' : Number(e.target.value) })}
          className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm"
          placeholder="∞"
          min={0}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Data inicial</label>
        <input
          type="date"
          value={value.dataIni ?? ''}
          onChange={(e) => set({ dataIni: e.target.value || undefined })}
          className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Data final</label>
        <input
          type="date"
          value={value.dataFim ?? ''}
          onChange={(e) => set({ dataFim: e.target.value || undefined })}
          className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm"
        />
      </div>

      <div className="md:col-span-5">
        <button
          type="button"
          onClick={() => onClear?.()}
          className="text-xs px-3 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
};
