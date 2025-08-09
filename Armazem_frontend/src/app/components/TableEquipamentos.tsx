'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageCheck } from 'lucide-react';
import { format } from 'date-fns';

interface Equipamento {
  id: number;
  nome: string;
  quantidade: number;
  data: string;
}

interface TableEquipamentosProps {
  data: Equipamento[];
}

const TableEquipamentos = ({ data }: TableEquipamentosProps) => {
  const [loading, setLoading] = useState(true);
  const [visibleData, setVisibleData] = useState<Equipamento[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleData(data);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-6xl mx-auto"
    >
      <Card className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 transition-colors">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <PackageCheck className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl md:text-3xl font-semibold text-zinc-800 dark:text-white border-b border-zinc-200 dark:border-zinc-700 text-center">
              Equipamentos em Estoque
            </h2>
          </div>

          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-full table-auto border-collapse overflow-hidden text-sm">
              <thead className="bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-white">
                <tr>
                  <th className="p-4 text-left font-medium">ID</th>
                  <th className="p-4 text-left font-medium">Equipamento</th>
                  <th className="p-4 text-left font-medium">Quantidade</th>
                  <th className="p-4 text-left font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="bg-zinc-900">
                        <td className="p-4">
                          <Skeleton className="h-4 w-12 bg-zinc-800" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-32 bg-zinc-800" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-16 bg-zinc-800" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-24 bg-zinc-800" />
                        </td>
                      </tr>
                    ))
                  : visibleData.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`${
                            index % 2 === 0
                              ? 'bg-zinc-50 dark:bg-zinc-900'
                              : 'bg-white dark:bg-zinc-800'
                          } hover:bg-blue-50 dark:hover:bg-zinc-700 transition-all`}
                        >
                        <td className="p-4 text-zinc-800 dark:text-white border-b border-zinc-200 dark:border-zinc-700">{item.id}</td>
                        <td className="p-4 text-zinc-800 dark:text-white border-b border-zinc-200 dark:border-zinc-700">{item.nome}</td>
                        <td className="p-4 text-zinc-800 dark:text-white border-b border-zinc-200 dark:border-zinc-700">{item.quantidade}</td>
                        <td className="p-4 text-zinc-800 dark:text-white border-b border-zinc-200 dark:border-zinc-700">
                          {format(new Date(item.data), 'dd/MM/yyyy')}
                        </td>
                      </motion.tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TableEquipamentos;
