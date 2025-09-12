"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Filter, Loader2, RefreshCw, Search, Printer, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";

type Estoque = { id: number; nome: string };

type Movimento = {
  id: string;
  data: string; // ISO date
  estoqueId: number;
  estoqueNome: string;
  itemId: string;
  itemNome: string;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  usuario: string;
};

type Resumo = {
  entradas: number;
  saidas: number;
  saldo: number;
  itensUnicos: number;
};

// -----------------------
// Helpers
// -----------------------

function toBRDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function downloadCSV(filename: string, rows: any[]) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// -----------------------
// Página
// -----------------------

export default function ReportsPage() {
  // Filtros
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [estoqueId, setEstoqueId] = useState<string>("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [groupBy, setGroupBy] = useState<"dia" | "item">("dia");

  // Dados
  const [loading, setLoading] = useState(false);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ entradas: 0, saidas: 0, saldo: 0, itensUnicos: 0 });

  // Tabela
  const [sorting, setSorting] = useState<SortingState>([{ id: "data", desc: true }]);

  // Mount: carrega estoques + datas padrão (últimos 7 dias)
  useEffect(() => {
    const d = new Date();
    const to = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - 6);
    const from = d.toISOString().slice(0, 10);
    setDateFrom(from);
    setDateTo(to);

    (async () => {
      try {
        const { data } = await api.get<Estoque[] | { items: Estoque[] }>("/estoques/disponiveis", { withCredentials: true });
        const items: Estoque[] = Array.isArray(data) ? data : "items" in data ? data.items : [];
        setEstoques(items);
        if (items[0]?.id) setEstoqueId(String(items[0].id));
      } catch (e) {
        // silencioso; página ainda funciona com filtros manuais
      }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        estoqueId: estoqueId || undefined,
        q: q || undefined,
        groupBy,
      };
      const { data } = await api.get<{ items: Movimento[]; resumo: Resumo }>("/relatorios/movimentos", {
        params,
        withCredentials: true,
      });
      setMovimentos(data.items || []);
      setResumo(data.resumo || { entradas: 0, saidas: 0, saldo: 0, itensUnicos: 0 });
    } catch (e) {
      // Fallback: mantém dados anteriores
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, estoqueId, q, groupBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Colunas da tabela
  const columns = useMemo<ColumnDef<Movimento>[]>(
    () => [
      { accessorKey: "data", header: "Data", cell: ({ row }) => <span>{toBRDate(row.original.data)}</span> },
      { accessorKey: "estoqueNome", header: "Estoque" },
      { accessorKey: "itemNome", header: "Item" },
      { accessorKey: "tipo", header: "Tipo", cell: ({ getValue }) => (
          <Badge variant={getValue<string>() === "ENTRADA" ? "default" : "secondary"}>{getValue<string>()}</Badge>
        ) },
      { accessorKey: "quantidade", header: "Qtd", cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>, size: 80 },
      { accessorKey: "usuario", header: "Usuário" },
    ],
    []
  );

  const table = useReactTable({
    data: movimentos,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Virtualização
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  // Série para gráfico
  const series = useMemo(() => {
    // agrega por dia saldo (entradas - saídas)
    const map = new Map<string, number>();
    for (const m of movimentos) {
      const key = m.data.substring(0, 10);
      const delta = m.tipo === "ENTRADA" ? m.quantidade : -m.quantidade;
      map.set(key, (map.get(key) || 0) + delta);
    }
    return Array.from(map.entries())
      .map(([date, valor]) => ({ date, valor }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [movimentos]);

  // Export CSV
  const handleExport = () => {
    const rows = movimentos.map((m) => ({
      data: toBRDate(m.data),
      estoque: m.estoqueNome,
      item: m.itemNome,
      tipo: m.tipo,
      quantidade: m.quantidade,
      usuario: m.usuario,
    }));
    downloadCSV("relatorio-movimentos.csv", rows);
  };

  // Print (PDF via print dialog)
  const handlePrint = () => window.print();

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Relatório de Movimentações</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button variant="ghost" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label>Estoque</Label>
              <Select value={estoqueId} onValueChange={setEstoqueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estoque" />
                </SelectTrigger>
                <SelectContent>
                  {estoques.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      #{e.id} — {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Busca</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="item, usuário..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button variant="secondary" onClick={fetchData}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <TabsList>
                <TabsTrigger value="dia">Agrupar por dia</TabsTrigger>
                <TabsTrigger value="item">Agrupar por item</TabsTrigger>
              </TabsList>
            </Tabs>
            <Separator orientation="vertical" className="h-6" />
            <Badge variant="outline" className="font-normal">{movimentos.length} registros</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Entradas</div>
            <div className="text-2xl font-semibold tabular-nums">{resumo.entradas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Saídas</div>
            <div className="text-2xl font-semibold tabular-nums">{resumo.saidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Saldo</div>
            <div className="text-2xl font-semibold tabular-nums">{resumo.saldo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Itens únicos</div>
            <div className="text-2xl font-semibold tabular-nums">{resumo.itensUnicos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR")} />
                <YAxis allowDecimals={false} />
                <RTooltip formatter={(v: any) => [v, "Saldo"]} labelFormatter={(v) => new Date(v).toLocaleDateString("pt-BR")} />
                <Line type="monotone" dataKey="valor" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela virtualizada */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="text-left font-medium px-3 py-2 select-none cursor-pointer"
                        onClick={h.column.getToggleSortingHandler()}
                        style={{ width: h.getSize() }}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: "↑", desc: "↓" }[h.column.getIsSorted() as string]}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
            </table>
          </div>

          <div ref={parentRef} className="h-[420px] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <tbody style={{ height: rowVirtualizer.getTotalSize() }}>
                {virtualRows.map((vr) => {
                  const row = table.getRowModel().rows[vr.index];
                  return (
                    <tr
                      key={row.id}
                      data-index={vr.index}
                      ref={(node) => rowVirtualizer.measureElement(node as any)}
                      className={vr.index % 2 ? "bg-muted/30" : ""}
                      style={{ transform: `translateY(${vr.start}px)` }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-right">Última atualização: {new Date().toLocaleString("pt-BR")}</div>
    </div>
  );
}
