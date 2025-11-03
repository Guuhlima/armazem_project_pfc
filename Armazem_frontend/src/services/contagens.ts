import api from "./api"; 

export type CountStatus = "PENDING" | "IN_PROGRESS" | "RECOUNT_REQUIRED" | "CLOSED" | "CANCELED";

export interface ContagemItem {
  id: number;
  nome?: string | null;
}
export interface ContagemEstoque {
  id: number;
  nome?: string | null;
}
export interface ContagemLancamento {
  id: number;
  tentativa: number;
  quantidade: number;
  contadoPorId?: number | null;
  contadoEm: string;
}

export interface ContagemTarefa {
  id: number;
  estoqueId: number;
  itemId: number;
  status: CountStatus;
  dueAt: string;
  startedAt?: string | null;
  closedAt?: string | null;
  systemQtyAtStart?: number | null;
  finalQty?: number | null;
  toleranciaPct?: number | null;
  contagemDupla?: boolean | null;
  bloquearMov?: boolean | null;
  item?: ContagemItem;
  estoque?: ContagemEstoque;
  lancamentos?: ContagemLancamento[];
}

export interface ServiceResult {
  ok: boolean;
  [k: string]: any;
}

export async function listTarefas(status?: CountStatus): Promise<ContagemTarefa[]> {
  const { data } = await api.get("/counting/tasks", { params: { status } });
  return data;
}

export async function gerarTarefas(): Promise<{ ok: boolean; criadas: number }> {
  const { data } = await api.post("/counting/generate");
  return data;
}

export async function iniciarTarefa(id: number, userId: number): Promise<ServiceResult> {
  const { data } = await api.post(`/counting/${id}/start`, { userId });
  return data;
}

export async function lancarContagem(id: number, userId: number, quantidade: number): Promise<ServiceResult> {
  const { data } = await api.post(`/counting/${id}/input`, { userId, quantidade });
  return data;
}

export async function cancelarTarefa(id: number, motivo?: string): Promise<ServiceResult> {
  const { data } = await api.post(`/counting/${id}/cancel`, { motivo });
  return data;
}
