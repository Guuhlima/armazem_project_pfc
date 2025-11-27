"use client";

import React, { useEffect, useMemo, useState } from "react";
import withAuth from "../components/withAuth";
import api from "@/services/api";
import Sidebar from "../components/Sidebar";
import TableEquipamentos from "../components/TableEquipamentos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageCheck, Plus, Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMyWarehouses } from "@/hooks/useMyWarehouses";
import { useAuth } from "@/contexts/AuthContext";
import type { Equipamento } from "@/types/equipamento";
import { RequestWarehouseModal } from "../components/RequestWarehouseModal";
import { Separator } from "@/components/ui/separator";
import { FilterEquipamentos } from "../components/FilterEquipamentos";
import { CountStatus, listTarefas } from "@/services/contagens";
import { ContagemModal } from "./components/ContagemModal";

type BackendEquip = {
  id: number;
  nome?: string | null;
  equipamento?: string | null;
  quantidade?: number | null;
  data?: string | Date | null;
  warehouseId?: number | null;
};

type Filters = {
  nome?: string;
  qntMin?: number | "";
  qntMax?: number | "";
  dataIni?: string;
  dataFim?: string;
  warehouseId?: number | "";
};

const Home = () => {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [openReq, setOpenReq] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Equipamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [contagemCiclica, setContagemCiclica] = useState(0);
  const [alertouContagem, setAlertouContagem] = useState(false);
  const [modalContagemOpen, setModalContagemOpen] = useState(false);

  const router = useRouter();
  const { logout, user, roles } = useAuth();
  const { loading, isLinked, names, refresh, warehouses } = useMyWarehouses();

  const warehouseOptions = useMemo(
    () =>
      (warehouses || []).map((w) => ({
        id: w.id,
        nome: (w.nome ?? `Armazém ${w.id}`) as string,
      })),
    [warehouses]
  );

  const isEquipamentosUser = useMemo(
    () =>
      roles?.includes("USER-EQUIPAMENTOS"),
    [roles]
  );

  const linkedWarehouseIds = useMemo(
    () => (warehouses || []).map((w) => w.id),
    [warehouses]
  );

  const warehousesParam = useMemo(
    () => linkedWarehouseIds.join(","),
    [linkedWarehouseIds]
  )

  function irParaContagemCiclica() {
    router.push("/transfer?view=contagemCiclica");
  }

  useEffect(() => {
    (async () => {
      try {
        if (loading) return;
        if (!isLinked || linkedWarehouseIds.length === 0) {
          setEquipamentos([]);
          return;
        }

        const { data } = await api.get<BackendEquip[]>(
          "/equipment/visualizar",
          {
            params: { warehouses: warehousesParam },
          }
        );

        const onlyLinked = (Array.isArray(data) ? data : []).filter(
          (item) =>
            item?.warehouseId != null &&
            linkedWarehouseIds.includes(item.warehouseId!)
        );

        const normalized: Equipamento[] = onlyLinked.map((e) => {
          let dateStr = "";
          if (e.data) {
            const d =
              typeof e.data === "string" ? new Date(e.data) : (e.data as Date);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().slice(0, 10);
            }
          }
          return {
            id: e.id,
            nome: (e.nome ?? e.equipamento ?? "—").toString(),
            quantidade: e.quantidade ?? 0,
            data: dateStr,
            warehouseId: e.warehouseId ?? undefined,
          };
        });

        setEquipamentos(normalized);
      } catch (err) {
        console.error(err);
        setEquipamentos([]);
      }
    })();
  }, [loading, isLinked, warehousesParam, linkedWarehouseIds]);

  const nomesDisponiveis = useMemo(() => {
    const set = new Set(equipamentos.map((e) => e.nome).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [equipamentos]);

  const filteredEquipamentos = useMemo(() => {
    return equipamentos.filter((e) => {
      if (
        filters.warehouseId !== '' &&
        filters.warehouseId != null &&
        e.warehouseId !== Number(filters.warehouseId)
      ) {
        return false;
      }

      if (filters.nome && e.nome !== filters.nome) return false;

      if (
        filters.qntMin !== "" &&
        filters.qntMin != null &&
        e.quantidade < Number(filters.qntMin)
      ) {
        return false;
      }
      if (
        filters.qntMax !== "" &&
        filters.qntMax != null &&
        e.quantidade > Number(filters.qntMax)
      ) {
        return false;
      }

      if (filters.dataIni && e.data && e.data < filters.dataIni) return false;
      if (filters.dataFim && e.data && e.data > filters.dataFim) return false;

      return true;
    });
  }, [equipamentos, filters]);


  useEffect(() => {
    if (isEquipamentosUser) {
      setContagemCiclica(0);
      return;
    }

    let cancelado = false;

    async function checarContagens() {
      try {
        const tarefas = await listTarefas("PENDING" as CountStatus);
        if (cancelado) return;

        setContagemCiclica(tarefas.length)

      } catch (err) {
        console.error("Erro ao buscar contagens ciclicas", err);
      }
    }

    checarContagens();

    const intervalId = setInterval(checarContagens, 60_000);

    return () => {
      cancelado = true;
      clearInterval(intervalId);
    }
  }, [isEquipamentosUser])

  useEffect(() => {
    if (isEquipamentosUser) return;

    if (contagemCiclica > 0 && !alertouContagem) {
      setModalContagemOpen(true);
      setAlertouContagem(true);
    }

    if (contagemCiclica === 0 && alertouContagem) {
      setAlertouContagem(false);
    }
  }, [contagemCiclica, alertouContagem, isEquipamentosUser]);


  useEffect(() => {
    if (contagemCiclica > 0 && !alertouContagem) {
      setModalContagemOpen(true);
      setAlertouContagem(true);
    }

    if (contagemCiclica === 0 && alertouContagem) {
      setAlertouContagem(true);
    }
  }, [contagemCiclica, alertouContagem])

  const handleSelect = (item: Equipamento) => setSelectedId(item.id);

  const handleCardClick = () => {
    if (isLinked) router.push("/estoque/acess");
    else setOpenReq(true);
  };

  // EDIT
  const handleEdit = (item: Equipamento) => {
    setEditData(item);
    setEditOpen(true);
  };

  const handleEditField = (
    field: keyof Equipamento,
    value: string | number
  ) => {
    if (!editData) return;
    setEditData({
      ...editData,
      [field]: field === "quantidade" ? Number(value) : (value as any),
    });
  };

  const submitEdit = async () => {
    if (!editData) return;
    try {
      setSaving(true);
      const payload = {
        nome: editData.nome,
        quantidade: editData.quantidade,
        data: editData.data || null,
      };
      await api.put(`/equipment/editar/${editData.id}`, payload);
      setEquipamentos((prev) =>
        prev.map((e) => (e.id === editData.id ? { ...editData } : e))
      );
      setEditOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // DELETE
  const handleDelete = async (item: Equipamento) => {
    if (!confirm(`Excluir "${item.nome}" (ID ${item.id})?`)) return;
    try {
      setDeletingId(item.id);
      await api.delete(`/equipment/deletar/${item.id}`);
      setEquipamentos((prev) => prev.filter((e) => e.id !== item.id));
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const ok = confirm(
          "Há vínculos (estoque/lotes/seriais/histórico). Deseja arquivar o equipamento?"
        );
        if (ok) {
          await api.patch(`/equipment/arquivar/${item.id}`);
          setEquipamentos((prev) => prev.filter((e) => e.id !== item.id)); // some da lista
        }
      } else {
        alert(e?.response?.data?.message ?? "Erro ao excluir");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const userName = user?.nome?.split(" ")[0] ?? "Usuário";

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-100 dark:bg-zinc-950 transition-colors">
      <div
        className="absolute inset-0 z-0 animate-pan-wireframe"
        style={{
          backgroundColor: "transparent",
          backgroundImage: `
            repeating-linear-gradient(45deg,
              rgba(59, 130, 246, 0.15) 0, rgba(59, 130, 246, 0.15) 1px,
              transparent 1px, transparent 30px
            ),
            repeating-linear-gradient(-45deg,
              rgba(59, 130, 246, 0.15) 0, rgba(59, 130, 246, 0.15) 1px,
              transparent 1px, transparent 30px
            )
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10">
        <Sidebar
          onLogout={logout}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />

        <main
          className={`transition-all duration-300 p-6 pt-4 space-y-8 ${collapsed ? "ml-16" : "ml-60"
            }`}
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Olá, {userName}! Visão geral do seu inventário.
            </p>
          </div>

          <div>
            {contagemCiclica > 0 && (
              <div className="mt-3 mb-2 rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 flex items-center justify-between">
                <span>
                  Você tem <strong>{contagemCiclica}</strong> contagens cíclicas pendentes
                </span>
                <button
                  className="text-sm font-medium underline"
                  onClick={irParaContagemCiclica}
                >
                  Ir para contagem
                </button>
              </div>
            )}
          </div>
          <Separator className="bg-zinc-200 dark:bg-zinc-700/50" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Card className="bg-white/90 dark:bg-zinc-900/70 border border-blue-500/10 dark:border-blue-500/20 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Total Itens
                </CardTitle>
                <PackageCheck className="w-5 h-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {filteredEquipamentos.length}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Equipamentos (após filtros)
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/equipamento/create")}
              className="bg-white/90 dark:bg-zinc-900/70 border border-blue-500/10 dark:border-blue-500/20 shadow-sm cursor-pointer group"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Novo Equipamento
                </CardTitle>
                <Plus className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                  Adicionar
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={handleCardClick}
              className={`bg-white/90 dark:bg-zinc-900/70 border border-blue-500/10 dark:border-blue-500/20 shadow-sm ${isLinked ? "hover:border-blue-500/30 cursor-pointer" : ""
                }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Meu Armazém
                </CardTitle>
                <Warehouse className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-6 w-full bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded mt-1" />
                ) : isLinked ? (
                  <>
                    <div
                      className="text-xl font-semibold truncate"
                      title={names}
                    >
                      {names}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Clique para ver detalhes
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      Não Vinculado
                    </div>
                    <button
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenReq(true);
                      }}
                    >
                      Solicitar acesso
                    </button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-700/50" />

          <section className="relative z-10 space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Inventário Rápido
            </h2>

            <Card className="bg-white/90 dark:bg-zinc-900/70 border border-blue-500/10 dark:border-blue-500/20 shadow-sm">
              <CardContent className="p-4">
                <FilterEquipamentos
                  warehousesDisponiveis={warehouseOptions}
                  nomesDisponiveis={nomesDisponiveis}
                  value={filters}
                  onChange={setFilters}
                  onClear={() => setFilters({})}
                />
              </CardContent>
            </Card>

            <Card className="bg-white/90 dark:bg-zinc-900/70 border border-blue-500/10 dark:border-blue-500/20 shadow-sm">
              <CardContent className="p-0">
                <TableEquipamentos
                  data={loading ? [] : filteredEquipamentos}
                  selectable
                  selectedId={selectedId ?? undefined}
                  onSelect={handleSelect}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                />
              </CardContent>
            </Card>
          </section>
        </main>
      </div>

      <RequestWarehouseModal
        open={openReq}
        onClose={() => setOpenReq(false)}
        onRequested={refresh}
      />

      {/* Modal simples de edição */}
      {editOpen && editData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setEditOpen(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-lg w-full max-w-md p-5">
            <h3 className="text-lg font-semibold mb-4">Editar equipamento</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">
                  Nome
                </label>
                <input
                  className="mt-1 w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm"
                  value={editData.nome}
                  onChange={(e) => handleEditField("nome", e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">
                  Quantidade
                </label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm"
                  value={editData.quantidade}
                  onChange={(e) =>
                    handleEditField("quantidade", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">
                  Data de cadastro
                </label>
                <input
                  type="date"
                  className="mt-1 w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm"
                  value={
                    editData.data
                      ? new Date(editData.data).toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) => {
                    const iso = e.target.value
                      ? `${e.target.value}T00:00:00.000Z`
                      : "";
                    handleEditField("data", iso);
                  }}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-3 h-9 rounded-md border border-zinc-300 dark:border-zinc-700"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={submitEdit}
                className="px-3 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ContagemModal
        open={modalContagemOpen}
        quantidade={contagemCiclica}
        onClose={() => setModalContagemOpen(false)}
        onIrParaContagem={() => {
          setModalContagemOpen(false);
          router.push("/transfer?view=contagemCiclica")
        }}
      />
    </div>
  );
};

export default withAuth(Home);
