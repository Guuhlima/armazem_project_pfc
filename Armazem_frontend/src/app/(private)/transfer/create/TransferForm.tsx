"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transferSchema, TransferSchemaType } from "./schema";
import api from "@/services/api";

interface Estoque {
  id: number;
  nome: string;
}
interface Equipamento {
  id: number;
  nome: string;
}
interface Agendamento {
  id: number;
  itemId: number;
  estoqueOrigemId: number;
  estoqueDestinoId: number;
  quantidade: number;
  executarEm: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELED" | "FAILED";
  usuarioNome: string;
}

function classNames(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const STATUS_STYLES: Record<Agendamento["status"], string> = {
  PENDING:
    "bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30",
  PROCESSING:
    "bg-blue-100 text-blue-800 ring-blue-300 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30",
  COMPLETED:
    "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  CANCELED:
    "bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600",
  FAILED:
    "bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30",
};

type TelegramResult = "SENT" | "NO_DESTS" | "DISABLED" | "ERROR" | "SKIPPED";

type AlertEvent =
  | {
    kind: "OPEN";
    tipo: "ABAIXO_MINIMO" | "RUPTURA";
    quantidade: number;
    minimo: number;
    telegram?: TelegramResult;
  }
  | {
    kind: "THROTTLED";
    tipo: "ABAIXO_MINIMO" | "RUPTURA";
    quantidade: number;
    minimo: number;
    telegram?: TelegramResult;
  }
  | {
    kind: "RESOLVED";
    quantidade: number;
    minimo: number;
    telegram?: TelegramResult;
  }
  | { kind: "NONE" };

export default function TransferForm() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransferSchemaType>({ resolver: zodResolver(transferSchema) });

  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [itensDisponiveis, setItensDisponiveis] = useState<Equipamento[]>([]);
  const [estoqueOrigemId, setEstoqueOrigemId] = useState<number | null>(null);
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState<
    number | null
  >(null);
  const [modoAgendar, setModoAgendar] = useState(false);
  const [executarEmLocal, setExecutarEmLocal] = useState<string>("");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loteCodigo, setLoteCodigo] = useState<string>("");
  const [serialNumero, setSerialNumero] = useState<string>("");

  const selectedItemId = watch("itemId");

  const estoquesMap = useMemo(() => {
    const m = new Map<number, string>();
    estoques.forEach((e) => m.set(e.id, e.nome));
    return m;
  }, [estoques]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingInit(true);
        const [eRes, aRes] = await Promise.all([
          api.get("/stock/visualizar"),
          api.get("/agendamentos"),
        ]);
        setEstoques(eRes.data);
        setAgendamentos(aRes.data);
      } catch (error) {
        console.error("Erro ao inicializar", error);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  async function refreshAgendamentos() {
    try {
      const res = await api.get("/agendamentos");
      setAgendamentos(res.data);
    } catch (e) {
      console.error("Erro ao listar agendamentos", e);
    }
  }

  async function fetchItensDoEstoque(estoqueId: number) {
    try {
      const res = await api.get(`/stock/visualizar/${estoqueId}/itens`);
      const itensConvertidos = res.data.map((registro: any) => ({
        id: registro.item.id,
        nome: registro.item.nome,
      }));
      setItensDisponiveis(itensConvertidos);
      setValue("itemId", undefined as any);
    } catch (error) {
      console.error("Erro ao buscar itens do estoque", error);
    }
  }

  function tgLabel(tg?: TelegramResult) {
    if (!tg) return "";
    const map: Record<TelegramResult, string> = {
      SENT: "enviado",
      NO_DESTS: "sem destinatários",
      DISABLED: "desabilitado",
      ERROR: "erro",
      SKIPPED: "pulado",
    };
    return ` • tg: ${map[tg] ?? tg}`;
  }

  function toastAlert(where: "Origem" | "Destino", a?: AlertEvent) {
    if (!a || !("kind" in a)) return;
    const suffix = tgLabel((a as any).telegram);

    if (a.kind === "OPEN") {
      if ((a as any).tipo === "RUPTURA") {
        toast(
          `🛑 Ruptura • ${where} • Qtd ${(a as any).quantidade} / Mín ${(a as any).minimo
          }${suffix}`,
          true
        );
      } else {
        toast(
          `⚠️ Abaixo do mínimo • ${where} • Qtd ${(a as any).quantidade
          } / Mín ${(a as any).minimo}${suffix}`
        );
      }
    } else if (a.kind === "RESOLVED") {
      toast(
        `✅ Normalizado • ${where} • Qtd ${(a as any).quantidade} / Mín ${(a as any).minimo
        }${suffix}`
      );
    }
  }

  const handleChangeOrigem = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    if (!isNaN(id)) {
      setEstoqueOrigemId(id);
      fetchItensDoEstoque(id);
    } else {
      setEstoqueOrigemId(null);
      setItensDisponiveis([]);
    }
  };

  useEffect(() => {
    (async () => {
      if (!selectedItemId || !estoqueOrigemId) {
        setQuantidadeDisponivel(null);
        return;
      }
      try {
        const res = await api.get(
          `/stockmovi/visualizar/${estoqueOrigemId}/itens-quantidade/${selectedItemId}`
        );
        setQuantidadeDisponivel(res.data.quantidade || 0);
      } catch (error) {
        console.error("Erro ao buscar quantidade do item", error);
        setQuantidadeDisponivel(null);
      }
    })();
  }, [selectedItemId, estoqueOrigemId]);

  const onSubmit = async (data: TransferSchemaType) => {
    try {
      let payload: TransferSchemaType = { ...data };

      if (loteCodigo) payload.loteCodigo = loteCodigo;
      if (serialNumero) payload.serialNumero = serialNumero;

      if (modoAgendar) {
        if (!executarEmLocal) {
          toast("Informe a data/hora para agendar.", true);
          return;
        }
        const local = new Date(executarEmLocal);
        const iso = new Date(
          local.getFullYear(),
          local.getMonth(),
          local.getDate(),
          local.getHours(),
          local.getMinutes(),
          0,
          0
        ).toISOString();
        payload = { ...payload, executarEm: iso };
      } else {
        delete (payload as any).executarEm;
      }

      if (
        quantidadeDisponivel != null &&
        payload.quantidade > quantidadeDisponivel &&
        !modoAgendar
      ) {
        toast(
          `Quantidade (${payload.quantidade}) excede o disponível (${quantidadeDisponivel}).`,
          true
        );
        return;
      }

      if (modoAgendar) {
        await api.post("/agendamentos", payload);
        setExecutarEmLocal("");
        await refreshAgendamentos();
        toast("Transferência agendada com sucesso!");
      } else {
        const { data: resp } = await api.post("/transfer/cadastro", payload);
        toast("Transferência realizada com sucesso!");

        toastAlert("Origem", resp?.alerts?.origem as AlertEvent | undefined);
        toastAlert("Destino", resp?.alerts?.destino as AlertEvent | undefined);

        if (resp?.transferTelegram) {
          const tg = resp.transferTelegram as TelegramResult;
          const msg =
            tg === "SENT"
              ? "📤 Telegram (transferência): enviado"
              : tg === "NO_DESTS"
                ? "📤 Telegram (transferência): sem destinatários"
                : tg === "DISABLED"
                  ? "📤 Telegram (transferência): desabilitado"
                  : tg === "ERROR"
                    ? "📤 Telegram (transferência): erro ao enviar"
                    : `📤 Telegram (transferência): ${tg}`;
          toast(msg, tg === "ERROR");
        }
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.error ?? "Erro ao processar.";
      toast(msg, true);
    }
  };

  async function cancelarAgendamento(id: number) {
    try {
      await api.delete(`/agendamentos/${id}`);
      await refreshAgendamentos();
      toast("Agendamento cancelado.");
    } catch (e: any) {
      toast(e?.response?.data?.error ?? "Erro ao cancelar agendamento", true);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-6 text-gray-900 dark:text-gray-100">
      {/* Card do formulário */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/50 p-6 space-y-6"
      >
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Transferência de equipamentos
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Escolha origem, item, destino e quantidade.
            </p>
          </div>

          {/* Segmented toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setModoAgendar(false)}
              className={classNames(
                "px-3 py-1.5 text-sm transition-colors",
                !modoAgendar
                  ? "bg-blue-600 text-white"
                  : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
              aria-pressed={!modoAgendar}
            >
              Transferir agora
            </button>
            <button
              type="button"
              onClick={() => setModoAgendar(true)}
              className={classNames(
                "px-3 py-1.5 text-sm transition-colors",
                modoAgendar
                  ? "bg-blue-600 text-white"
                  : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
              aria-pressed={modoAgendar}
            >
              Agendar
            </button>
          </div>
        </header>

        {/* Grid de campos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Estoque de origem</label>
            <select
              {...register("estoqueOrigemId", { valueAsNumber: true })}
              onChange={handleChangeOrigem}
              className="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {estoques.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            {errors.estoqueOrigemId && (
              <p className="text-xs text-rose-500">
                {errors.estoqueOrigemId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Equipamento</label>
            <select
              {...register("itemId", { valueAsNumber: true })}
              disabled={!estoqueOrigemId}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um equipamento</option>
              {itensDisponiveis.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
            {errors.itemId && (
              <p className="text-xs text-rose-500">{errors.itemId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Estoque de destino</label>
            <select
              {...register("estoqueDestinoId", { valueAsNumber: true })}
              disabled={!estoqueOrigemId}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {estoques
                .filter((e) => e.id !== estoqueOrigemId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
            </select>
            {errors.estoqueDestinoId && (
              <p className="text-xs text-rose-500">
                {errors.estoqueDestinoId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quantidade</label>
            <input
              type="number"
              min={1}
              {...register("quantidade", { valueAsNumber: true })}
              disabled={!estoqueOrigemId}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.quantidade && (
              <p className="text-xs text-rose-500">
                {errors.quantidade.message}
              </p>
            )}
            {quantidadeDisponivel !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Disponível em{" "}
                <span className="font-medium">
                  {estoquesMap.get(estoqueOrigemId!)}
                </span>
                : <strong>{quantidadeDisponivel}</strong>
              </p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Lote (código)</label>
            <input
              type="text"
              value={loteCodigo}
              onChange={(e) => setLoteCodigo(e.target.value)}
              placeholder="Ex.: L2025-10"
              disabled={!estoqueOrigemId || !selectedItemId}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Preencha se o item usa lote. O backend valida e pode recusar se
              faltar.
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Número de série</label>
            <input
              type="text"
              value={serialNumero}
              onChange={(e) => setSerialNumero(e.target.value)}
              placeholder="Ex.: SN-ABC-123"
              disabled={!estoqueOrigemId || !selectedItemId}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Preencha se o item é serializado. O backend valida e pode recusar
              se faltar.
            </p>
          </div>
          {modoAgendar && (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">Executar em</label>
              <input
                type="datetime-local"
                value={executarEmLocal}
                onChange={(e) => setExecutarEmLocal(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                O horário é convertido para ISO (UTC) ao enviar.
              </p>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!estoqueOrigemId || isSubmitting}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isSubmitting
              ? "Processando..."
              : modoAgendar
                ? "Agendar transferência"
                : "Transferir agora"}
          </button>
        </div>
      </form>

      {/* Lista de agendamentos */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Agendamentos</h3>
          {!loadingInit && (
            <button
              onClick={refreshAgendamentos}
              className="text-sm rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Atualizar lista"
            >
              Atualizar
            </button>
          )}
        </div>

        {loadingInit ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum agendamento por enquanto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agendamentos.map((ag) => (
              <div
                key={ag.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={classNames(
                      "inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ring-1",
                      STATUS_STYLES[ag.status]
                    )}
                  >
                    • {ag.status}
                  </span>
                  {ag.status === "PENDING" && (
                    <button
                      onClick={() => cancelarAgendamento(ag.id)}
                      className="text-sm rounded-md bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <div className="text-sm leading-6">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">ID #{ag.id}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(ag.executarEm).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Item:
                      </span>{" "}
                      {ag.itemId}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Criado por:</span>{" "}
                      {ag.usuarioNome}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Origem:
                      </span>{" "}
                      {estoquesMap.get(ag.estoqueOrigemId) ??
                        ag.estoqueOrigemId}{" "}
                      <span className="text-gray-500 dark:text-gray-400">
                        → Destino:
                      </span>{" "}
                      {estoquesMap.get(ag.estoqueDestinoId) ??
                        ag.estoqueDestinoId}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Qtd:
                      </span>{" "}
                      {ag.quantidade}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Toast simples sem lib */
function toast(msg: string, isError = false) {
  if (typeof window === "undefined") return;
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = classNames(
    "fixed z-[9999] left-1/2 -translate-x-1/2 bottom-6",
    "rounded-lg px-4 py-2 text-sm shadow-lg border",
    isError
      ? "bg-rose-600 text-white border-rose-700"
      : "bg-emerald-600 text-white border-emerald-700"
  );
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
