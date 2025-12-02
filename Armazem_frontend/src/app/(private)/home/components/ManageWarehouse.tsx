// ./components/ManageWarehouse.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { listAllStocks, requestAccessToStock, type Warehouse } from "@/services/stock";

export default function ManageWarehousesModal({
  open,
  onClose,
  excludeIds = [],
  isSuperAdmin,
  isAdmin,
  onAfterAction,
}: {
  open: boolean;
  onClose: () => void;
  excludeIds?: number[];       // IDs já vinculados (para ocultar da lista)
  isSuperAdmin: boolean;
  isAdmin: boolean;
  onAfterAction: () => void;   // normalmente useMyWarehouses().refresh
}) {
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // carrega a lista quando abrir
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listAllStocks()
      .then((all) => setStocks(all || []))
      .catch((e) => {
        console.error(e);
        Swal.fire({
          title: "Erro",
          text: e?.response?.data?.error ?? "Falha ao listar armazéns.",
          icon: "error",
          background: "#0b0b0b",
          color: "#e5e7eb",
        });
      })
      .finally(() => setLoading(false));
  }, [open]);

  // opções visíveis = todos os armazéns menos os já vinculados
  const options = useMemo(
    () => (stocks || []).filter((s) => !excludeIds.includes(s.id)),
    [stocks, excludeIds]
  );

  const podeAção = isSuperAdmin || isAdmin;
  const canSubmit = !!warehouseId && !submitting && podeAção;

  const handleSubmit = async () => {
    if (!warehouseId) return;
    if (!podeAção) {
      Swal.fire({
        title: "Permissão necessária",
        text: "Apenas ADMIN ou SUPER-ADMIN podem solicitar/vincular.",
        icon: "error",
        background: "#0b0b0b",
        color: "#e5e7eb",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (isSuperAdmin) {
        // SUPER-ADMIN: vínculo direto (ajuste a rota caso seu backend use outro nome)
        await api.post("/warehouse/link", { warehouseId: Number(warehouseId) });
        await Swal.fire({
          icon: "success",
          title: "Vinculado!",
          text: "Você foi vinculado ao armazém selecionado.",
          timer: 1600,
          showConfirmButton: false,
          background: "#0b0b0b",
          color: "#e5e7eb",
        });
      } else {
        // ADMIN (ou outros): solicita aprovação
        await requestAccessToStock(Number(warehouseId), reason || undefined);
        await Swal.fire({
          icon: "success",
          title: "Solicitação enviada",
          text: "Aguardando aprovação do admin do armazém.",
          timer: 2000,
          showConfirmButton: false,
          background: "#0b0b0b",
          color: "#e5e7eb",
        });
      }

      onAfterAction();
      onClose();
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        title: "Erro",
        text: e?.response?.data?.error ?? "Não foi possível completar a ação.",
        icon: "error",
        background: "#0b0b0b",
        color: "#e5e7eb",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg shadow-lg bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Vincular a outro armazém</h3>
          <button className="text-sm opacity-70 hover:opacity-100" onClick={onClose}>
            Fechar
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
            <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
          </div>
        ) : options.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Não há armazéns disponíveis para vincular (ou você já está vinculado a todos).
          </p>
        ) : (
          <>
            <label className="block text-sm mb-2">Selecione o armazém</label>
            <select
              className="w-full border rounded p-2 text-black mb-4"
              value={warehouseId}
              onChange={(e) =>
                setWarehouseId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— Selecione —</option>
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>

            {!isSuperAdmin && (
              <>
                <label className="block text-sm mb-2">Motivo (opcional)</label>
                <textarea
                  className="w-full border rounded p-2 text-black mb-4"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Por que você precisa de acesso?"
                />
              </>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-3 py-2 rounded border">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {submitting
                  ? isSuperAdmin
                    ? "Vinculando…"
                    : "Enviando…"
                  : isSuperAdmin
                  ? "Vincular agora"
                  : "Enviar solicitação"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
