import api from "./api";

export type Agendamento = {
  id: number;
  itemId: number;
  estoqueOrigemId: number;
  estoqueDestinoId: number;
  quantidade: number;
  executarEm: string;
  status: 'PENDING'|'EXECUTED'|'DONE'|'FAILED'|'CANCELED';
  origemTipo?: 'AUTO'|'MANUAL'|null;
  motivo?: string|null;
  transferenciaId?: number|null;
  createdAt?: string;
};

export type Warehouse = { id: number; nome: string };

export type EstoqueItemConfig = {
  itemId: number;
  estoqueId: number;
  quantidade: number;
  minimo: number;
  maximo?: number|null;
  multiplo?: number|null;
  autoAtivo: boolean;
  origemPreferidaId?: number|null;
  leadTimeDias?: number|null;
};

// ——— Config por item/estoque ———
export async function getItemConfig(estoqueId: number, itemId: number) {
  const { data } = await api.get<EstoqueItemConfig>(`/estoques/${estoqueId}/itens/${itemId}`);
  return data;
}

export async function patchAutoRepo(
  estoqueId: number, itemId: number,
  body: Partial<Pick<EstoqueItemConfig,'autoAtivo'|'maximo'|'multiplo'|'origemPreferidaId'>>
) {
  const { data } = await api.patch<EstoqueItemConfig>(`/estoques/${estoqueId}/itens/${itemId}/auto`, body);
  return data;
}

// ——— Listagens auxiliares ———
export async function meusEstoques() {
  const { data } = await api.get<{ warehouses: Warehouse[] }>(`/estoques/me`);
  return data.warehouses;
}

export async function listarEstoquesDisponiveis() {
  const { data } = await api.get<Warehouse[]>(`/estoques/disponiveis`);
  return data;
}

// ——— Agendamentos ———
export async function listarAgendamentos() {
  const { data } = await api.get<Agendamento[]>(`/agendamentos`);
  return data;
}
export async function getAgendamento(id: number) {
  const { data } = await api.get<Agendamento>(`/agendamentos/${id}`);
  return data;
}
export async function cancelAgendamento(id: number) {
  const { data } = await api.post<{ ok: true }>(`/agendamentos/${id}/cancel`, {});
  return data;
}