import { api } from '@/services/api';

export type Warehouse = { id: number; nome: string };

export async function listAllStocks() {
  const { data } = await api.get<Warehouse[]>('/stock/visualizar');
  return data;
}

export async function listMyStocks() {
  const { data } = await api.get<{ warehouses: Warehouse[] }>('/estoques/me');
  return data.warehouses ?? [];
}

export async function requestAccessToStock(estoqueId: number, reason?: string) {
  const { data } = await api.post(`/estoques/${estoqueId}/solicitar-acesso`, { reason });
  return data as { ok: boolean; requestId: number; status: 'PENDING' | 'APPROVED' | 'REJECTED' };
}

export type AccessRequest = {
  id: number;
  estoqueId: number;
  usuarioId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
  createdAt: string;
  usuario: { id: number; nome: string | null; email: string };
};

// LISTA AS REQUISIÇÕES DE ESTOQUE
export async function listStockRequests(estoqueId: number) {
  const { data } = await api.get<{ requests: AccessRequest[] }>(`/estoques/${estoqueId}/solicitacoes`);
  return data.requests;
}

// APROVA AS REQUISIÇÕES DE ESTOQUE
export async function approveStockRequest(estoqueId: number, reqId: number) {
  const { data } = await api.post(`/estoques/${estoqueId}/solicitacoes/${reqId}/aprovar`, {});
  return data;
}

// REJEITA A SOLICITAÇÃO DE ESTOQUE
export async function rejectStockRequest(estoqueId: number, reqId: number, reason?: string) {
  const { data } = await api.post(`/estoques/${estoqueId}/solicitacoes/${reqId}/rejeitar`, { reason });
  return data;
}