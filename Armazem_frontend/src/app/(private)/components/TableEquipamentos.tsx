'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageCheck } from 'lucide-react';
import { format } from 'date-fns';

export interface Equipamento {
  id: number;
  nome: string;
  quantidade: number;
  data: string;
  warehouseId?: number;
}

interface TableEquipamentosProps {
  data: Equipamento[];
  selectable?: boolean;
  selectedId?: number;
  onSelect?: (item: Equipamento) => void;
  onEdit?: (item: Equipamento) => void;
  onDelete?: (item: Equipamento) => void;
  deletingId?: number | null;
}

const TableEquipamentos = ({
  data,
  selectable,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  deletingId,
}: TableEquipamentosProps) => {
  const [loading, setLoading] = useState(true);
  const [visibleData, setVisibleData] = useState<Equipamento[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleData(data);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-6xl mx-auto"
    >
      <Card className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <PackageCheck className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl md:text-3xl font-semibold border-b border-zinc-200 dark:border-zinc-700 text-center">
              Equipamentos em Estoque
            </h2>
          </div>

          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-full table-auto border-collapse text-sm">
              <thead className="bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-white">
                <tr>
                  {selectable && <th className="p-4 text-left font-medium w-10">Sel.</th>}
                  <th className="p-4 text-left font-medium">ID</th>
                  <th className="p-4 text-left font-medium">Equipamento</th>
                  <th className="p-4 text-left font-medium">Quantidade</th>
                  <th className="p-4 text-left font-medium">Data</th>
                  <th className="p-4 text-left font-medium w-36">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="bg-zinc-900">
                      {selectable && <td className="p-4"><Skeleton className="h-4 w-4 bg-zinc-800" /></td>}
                      <td className="p-4"><Skeleton className="h-4 w-12 bg-zinc-800" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32 bg-zinc-800" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-16 bg-zinc-800" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24 bg-zinc-800" /></td>
                      <td className="p-4"><Skeleton className="h-7 w-28 bg-zinc-800" /></td>
                    </tr>
                  ))
                  : visibleData.map((item, index) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <motion.tr
                        key={`${item.id}-${item.warehouseId ?? index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onSelect?.(item)}
                        className={`cursor-${onSelect ? 'pointer' : 'default'} ${index % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-900' : 'bg-white dark:bg-zinc-800'
                          } hover:bg-blue-50 dark:hover:bg-zinc-700 transition-all ${isSelected ? 'ring-1 ring-blue-400 dark:ring-blue-500' : ''}`}
                      >
                        {selectable && (
                          <td className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                            <input
                              type="radio"
                              name="equip-select"
                              checked={isSelected}
                              onChange={() => onSelect?.(item)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        <td className="p-4 border-b border-zinc-200 dark:border-zinc-700">{item.id}</td>
                        <td className="p-4 border-b border-zinc-200 dark:border-zinc-700">{item.nome}</td>
                        <td className="p-4 border-b border-zinc-200 dark:border-zinc-700">{item.quantidade}</td>
                        <td className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                          {item.data ? item.data.split('-').reverse().join('/') : '—'}
                        </td>
                        <td className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
                              className="px-2 py-1 text-xs rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                              Editar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete?.(item); }}
                              className="px-2 py-1 text-xs rounded-md border border-red-300 text-red-600 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60"
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? 'Excluindo…' : 'Excluir'}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TableEquipamentos;
