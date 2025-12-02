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
import { Download, Loader2, RefreshCw, Search, Printer, BarChart3, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { api } from "@/services/api";
import {
  ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import Sidebar from "@/app/(private)/components/Sidebar";
import Head from 'next/head';

type Estoque = { id: number; nome: string };

type Linha = {
  itemId: number;
  itemNome: string;
  estoqueId: number;
  estoqueNome: string;
  bucket: string;
  entradas: number;
  saidas: number;
  tipos: string[];
};

type RelatorioResponse = {
  periodo: { inicio: string; fim: string; granularity: "day" | "hour" };
  filtros: { itemId: number | null; estoqueId: number | null };
  linhas: Linha[];
};

type Resumo = {
  entradas: number;
  saidas: number;
  itensUnicos: number;
};

function toBRDate(iso: string) {
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function formatBucket(bucket: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) return toBRDate(bucket + "T00:00:00");
  const dt = new Date(bucket.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? bucket
    : dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
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

export default function ReportsPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [estoqueId, setEstoqueId] = useState<string>("");
  const [itemId, setItemId] = useState<string>("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [granularity, setGranularity] = useState<"day" | "hour">("day");
  const [loading, setLoading] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ entradas: 0, saidas: 0, itensUnicos: 0 });

  const [sorting, setSorting] = useState<SortingState>([{ id: "bucket", desc: false }]);

  useEffect(() => {
    const d = new Date();
    const to = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - 6);
    const from = d.toISOString().slice(0, 10);
    setDateFrom(from);
    setDateTo(to);

    (async () => {
      try {
        const { data } = await api.get<{ warehouses: Estoque[] }>("/estoques/me", {
          withCredentials: true,
        });

        const items = data.warehouses ?? [];
        setEstoques(items);

        if (items[0]?.id) {
          setEstoqueId(String(items[0].id));
        }
      } catch (e) {
        console.error("Erro ao carregar estoques do usuário", e);
        setEstoques([]);
        setEstoqueId("");
      }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        inicio: dateFrom || undefined,
        fim: dateTo || undefined,
        estoqueId: estoqueId ? Number(estoqueId) : undefined,
        itemId: itemId ? Number(itemId) : undefined,
        granularity,
      };
      const { data } = await api.get<RelatorioResponse>("/movimentacoes/relatorio", {
        params,
        withCredentials: true,
      });

      setLinhas(data.linhas ?? []);

      const totalEntradas = data.linhas?.reduce((acc, l) => acc + (l.entradas || 0), 0) ?? 0;
      const totalSaidas = data.linhas?.reduce((acc, l) => acc + (l.saidas || 0), 0) ?? 0;
      const itensUnicos = new Set(data.linhas?.map(l => l.itemId)).size;

      setResumo({ entradas: totalEntradas, saidas: totalSaidas, itensUnicos });
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, estoqueId, itemId, granularity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const linhasFiltradas = useMemo(() => {
    if (!q.trim()) return linhas;
    const needle = q.toLowerCase();
    return linhas.filter((l) => {
      const campos = [
        String(l.itemId),
        l.itemNome,
        String(l.estoqueId),
        l.estoqueNome,
        l.bucket,
        ...l.tipos,
      ].join(" ").toLowerCase();
      return campos.includes(needle);
    });
  }, [linhas, q]);

  const columns = useMemo<ColumnDef<Linha>[]>(
    () => [
      {
        accessorKey: "bucket",
        header: "Bucket",
        cell: ({ getValue }) => (
          <span>{formatBucket(getValue<string>())}</span>
        ),
      },
      {
        accessorKey: "estoqueNome",
        header: "Estoque",
      },
      {
        accessorKey: "itemNome",
        header: "Item",
      },
      {
        accessorKey: "entradas",
        header: "Entradas",
        cell: ({ getValue }) => (
          <span className="tabular-nums">
            {getValue<number>()?.toLocaleString("pt-BR")}
          </span>
        ),
      },
      {
        accessorKey: "saidas",
        header: "Saídas",
        cell: ({ getValue }) => (
          <span className="tabular-nums">
            {getValue<number>()?.toLocaleString("pt-BR")}
          </span>
        ),
      },
    ],
    []
  );


  const table = useReactTable({
    data: linhasFiltradas,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  const chartData = useMemo(() => {
    const buckets = new Map<string, { date: string; entradas: number; saidas: number }>();
    for (const l of linhas) {
      const key = l.bucket;
      if (!buckets.has(key)) buckets.set(key, { date: /^\d{4}-\d{2}-\d{2}$/.test(key) ? `${key}T00:00:00` : key.replace(" ", "T"), entradas: 0, saidas: 0 });
      const obj = buckets.get(key)!;
      obj.entradas += l.entradas;
      obj.saidas += l.saidas;
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [linhas]);

  const handleExport = () => {
    const rows = linhasFiltradas.map((l) => ({
      bucket: formatBucket(l.bucket),
      estoque: l.estoqueNome,
      item: l.itemNome,
      entradas: l.entradas,
      saidas: l.saidas,
      tipos: l.tipos.join("|"),
    }));
    downloadCSV("relatorio-movimentos.csv", rows);
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen flex">
      <Head>
        <title>Armazem G3</title>
        <link rel="icon" href="pub" />
      </Head>
      <aside className={`print:hidden hidden md:block border-r border-border bg-background h-screen sticky top-0 ${collapsed ? "w-16" : "w-64"} transition-[width] duration-200`}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
          onLogout={() => {
            localStorage.removeItem('auth');
            window.location.href = '/';
          }}
        />
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:inline-flex hidden"
                onClick={() => setCollapsed(v => !v)}
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              >
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </Button>
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

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label>Estoque</Label>
                  <Select value={estoqueId} onValueChange={setEstoqueId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um estoque" />
                    </SelectTrigger>
                    <SelectContent>
                      {estoques.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Item (opcional)</Label>
                  <Input placeholder="ID do item" value={itemId} onChange={(e) => setItemId(e.target.value)} />
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
                  <Label>Busca (local)</Label>
                  <div className="flex items-center gap-2">
                    <Input placeholder="item, estoque, tipo..." value={q} onChange={(e) => setQ(e.target.value)} />
                    <Button variant="secondary" onClick={fetchData}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Tabs value={granularity} onValueChange={(v) => setGranularity(v as "day" | "hour")}>
                  <TabsList>
                    <TabsTrigger value="day">Agrupar por dia</TabsTrigger>
                    <TabsTrigger value="hour">Agrupar por hora</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Separator orientation="vertical" className="h-6" />
                <Badge variant="outline" className="font-normal">{linhasFiltradas.length} linhas</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Entradas</div><div className="text-2xl font-semibold tabular-nums">{resumo.entradas}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Saídas</div><div className="text-2xl font-semibold tabular-nums">{resumo.saidas}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Itens únicos</div><div className="text-2xl font-semibold tabular-nums">{resumo.itensUnicos}</div></CardContent></Card>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => toBRDate(v)} />
                    <YAxis allowDecimals={false} />
                    <RTooltip
                      formatter={(v: any, name: any) => [v, name === 'entradas' ? 'Entradas' : 'Saídas']}
                      labelFormatter={(v) => toBRDate(v)}
                    />
                    <Line type="monotone" dataKey="entradas" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="saidas" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((h) => {
                          const isNumeric = ["entradas", "saidas"].includes(h.column.id);
                          return (
                            <th
                              key={h.id}
                              className={`font-medium px-3 py-2 select-none cursor-pointer ${isNumeric ? "text-right" : "text-left"
                                }`}
                              onClick={h.column.getToggleSortingHandler()}
                              style={{ width: h.getSize() }}
                            >
                              <div
                                className={`flex items-center gap-2 ${isNumeric ? "justify-end" : ""
                                  }`}
                              >
                                {flexRender(h.column.columnDef.header, h.getContext())}
                                {{ asc: "↑", desc: "↓" }[h.column.getIsSorted() as string]}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>

                </table>
              </div>

              <div ref={parentRef} className="h-[420px] overflow-auto">
                <table className="w-full min-w-[820px] text-sm">
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
                          {row.getVisibleCells().map((cell) => {
                            const isNumeric = ["entradas", "saidas"].includes(cell.column.id);
                            return (
                              <td
                                key={cell.id}
                                className={`px-3 py-2 ${isNumeric ? "text-right tabular-nums" : ""
                                  }`}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-right">
            Última atualização: {new Date().toLocaleString("pt-BR")}
          </div>
        </div>
      </main>
    </div>
  );
}