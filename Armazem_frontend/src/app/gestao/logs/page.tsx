"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useLogsSeries, useLogsTop, useLogsEvents } from "@/hooks/useLogs";
import type { Granularity, LogAction, LogType } from "@/services/logs";
import {
  BarChart3,
  RefreshCw,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const TYPES: LogType[] = ["ACCESS", "INVENTORY", "BOT"];
const ACTIONS: LogAction[] = [
  "LOGIN",
  "LOGOUT",
  "REQUEST",
  "CREATE",
  "UPDATE",
  "DELETE",
  "MOVE",
  "TRANSFER",
  "MESSAGE_SENT",
  "MESSAGE_FAILED",
];
const GRAN: Granularity[] = ["hour", "day", "week", "month"];

function dateISO(d: Date) {
  return d.toISOString();
}

export default function LogsPage() {
  // --- Sidebar layout (igual à tela que funciona)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // --- Filtros/estado
  const now = useMemo(() => new Date(), []);
  const sevenAgo = useMemo(
    () => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    [now]
  );

  const [inicio, setInicio] = useState(dateISO(sevenAgo));
  const [fim, setFim] = useState(dateISO(now));
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [type, setType] = useState<LogType | undefined>(undefined);
  const [action, setAction] = useState<LogAction | undefined>(undefined);
  const [success, setSuccess] = useState<string>("all"); // 'all' | 'ok' | 'fail'
  const [field, setField] = useState<
    "route" | "actor" | "item" | "estoque" | "errorCode"
  >("route");
  const [q, setQ] = useState("");

  const successBool = success === "all" ? undefined : success === "ok";

  // --- Queries
  const seriesQ = useLogsSeries({
    inicio,
    fim,
    granularity,
    tz: "America/Sao_Paulo",
    type,
    action,
    success: successBool,
  });
  const topQ = useLogsTop({
    inicio,
    fim,
    field,
    type,
    action,
    success: successBool,
    limit: 10,
  });
  const eventsQ = useLogsEvents({
    inicio,
    fim,
    q,
    type,
    action,
    success: successBool,
    size: 50,
  });

  const flatEvents = eventsQ.data?.pages.flatMap((p) => p.data) ?? [];

  // --- helpers de Select "Todos"
  const ALL = "__all__";
  const toRadix = (v?: string) => v ?? ALL;
  const fromRadix = <T extends string>(v: string): T | undefined =>
    v === ALL ? undefined : (v as T);

  // --- KPIs e datasets dos gráficos extras
  const kpis = useMemo(() => {
    const total = flatEvents.length;
    const ok = flatEvents.filter((e) => e.success).length;
    const fail = total - ok;
    return { total, ok, fail };
  }, [flatEvents]);

  const statusDonut = useMemo(
    () => [
      { name: "OK", value: kpis.ok },
      { name: "Falha", value: kpis.fail },
    ],
    [kpis]
  );

  const actionPie = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of flatEvents) {
      const key = ev.action || "—";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [flatEvents]);

  const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#14b8a6", "#e11d48", "#22c55e", "#a855f7", "#f97316"];

  // --- ações
  const refetchAll = () => {
    seriesQ.refetch();
    topQ.refetch();
    eventsQ.refetch();
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Sidebar integrada (como na tela que funciona) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onLogout={() => {
          localStorage.removeItem("auth");
          window.location.href = "/";
        }}
      />

      {/* Main com margem dependente do sidebar */}
      <main
        className={`transition-all duration-300 p-4 md:p-6 ${
          sidebarCollapsed ? "ml-16" : "ml-60"
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="h-5 w-5" />
                  ) : (
                    <PanelLeftClose className="h-5 w-5" />
                  )}
                </Button>
                <BarChart3 className="h-6 w-6" />
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Observabilidade de Logs</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Filtros avançados + gráficos (linha, colunas e pizza) para entender o que está rolando.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={refetchAll}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Filtros */}
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label>Início (ISO)</Label>
                  <Input
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    placeholder="2025-11-01T00:00:00.000Z"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Fim (ISO)</Label>
                  <Input
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                    placeholder="2025-11-08T23:59:59.999Z"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Granularidade</Label>
                  <Select
                    value={granularity}
                    onValueChange={(v) => setGranularity(v as Granularity)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="day" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAN.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Sucesso</Label>
                  <Select value={success} onValueChange={setSuccess}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ok">Apenas sucesso</SelectItem>
                      <SelectItem value="fail">Apenas falha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={toRadix(type)}
                    onValueChange={(v) => setType(fromRadix<LogType>(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label>Action</Label>
                  <Select
                    value={toRadix(action)}
                    onValueChange={(v) => setAction(fromRadix<LogAction>(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todas</SelectItem>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label>Busca (message/route/error)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="ex: transfer"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                    <Button variant="secondary" onClick={refetchAll} aria-label="Buscar">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Separator className="hidden md:block w-px h-6" />
                <Badge variant="outline" className="font-normal">
                  {flatEvents.length} eventos carregados
                </Badge>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-2xl font-semibold tabular-nums">{kpis.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Sucesso</div>
                <div className="text-2xl font-semibold tabular-nums">{kpis.ok}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Falha</div>
                <div className="text-2xl font-semibold tabular-nums">{kpis.fail}</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Linha (série temporal) */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Série temporal</h3>
                  {seriesQ.isFetching && (
                    <span className="text-xs text-muted-foreground">carregando…</span>
                  )}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={seriesQ.data?.data ?? []}
                      margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" />
                      <YAxis allowDecimals={false} />
                      <RTooltip />
                      <Line type="monotone" dataKey="total" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* “Gráfico de prédio” (colunas) — Top por campo */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    Top {topQ.data ? topQ.data.data.length : 10} — {field}
                  </h3>
                  <div className="w-48">
                    <Select value={field} onValueChange={(v) => setField(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="route">route</SelectItem>
                        <SelectItem value="actor">actor</SelectItem>
                        <SelectItem value="item">item</SelectItem>
                        <SelectItem value="estoque">estoque</SelectItem>
                        <SelectItem value="errorCode">errorCode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topQ.data?.data ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="key" />
                      <YAxis allowDecimals={false} />
                      <RTooltip />
                      <Bar dataKey="total" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Donut de status */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Distribuição por status</h3>
                  {eventsQ.isFetching && (
                    <span className="text-xs text-muted-foreground">carregando…</span>
                  )}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDonut}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {statusDonut.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pizza por Action */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Ações mais frequentes</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={actionPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {actionPie.map((_, i) => (
                          <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Eventos (Tabela) */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Eventos</h3>
                  {eventsQ.isFetching && (
                    <span className="text-xs text-muted-foreground">carregando…</span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 z-10 bg-background text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3">Quando</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Rota</th>
                      <th className="py-2 px-3">Msg</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatEvents.map((e, idx) => (
                      <tr
                        key={e.id}
                        className={idx % 2 ? "bg-muted/30 border-t" : "border-t"}
                      >
                        <td className="py-2 px-3 tabular-nums">
                          {new Date(e.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2 px-3">{e.type}</td>
                        <td className="py-2 px-3">{e.action}</td>
                        <td className="py-2 px-3">{e.route ?? "—"}</td>
                        <td className="py-2 px-3">{e.message ?? "—"}</td>
                        <td className="py-2 px-3">
                          {e.success ? (
                            <span className="text-green-600">OK</span>
                          ) : (
                            <span className="text-red-600">
                              {e.errorCode ?? "FAIL"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {flatEvents.length === 0 && !eventsQ.isFetching && (
                      <tr>
                        <td
                          className="py-6 px-3 text-center text-muted-foreground"
                          colSpan={6}
                        >
                          Sem eventos no período
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {eventsQ.hasNextPage && (
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => eventsQ.fetchNextPage()}
                    disabled={eventsQ.isFetchingNextPage}
                  >
                    {eventsQ.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
                  </Button>
                </div>
              )}
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
