// src/services/requests.ts
import { api } from '@/services/api';

export type AccessRequest = {
  id: number;
  estoqueId: number;
  usuarioId: number;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approverId?: number | null;
  decidedAt?: string | null;
  createdAt: string;
  estoque?: { id: number; nome: string };
  usuario?: { id: number; nome: string | null; email: string };
};

export async function getRequest(id: number): Promise<AccessRequest> {
  const { data } = await api.get(`/requests/${id}`);
  return data;
}

export async function approveRequest(id: number) {
  const { data } = await api.post(`/requests/${id}/approve`);
  return data;
}

export async function rejectRequest(id: number) {
  const { data } = await api.post(`/requests/${id}/reject`);
  return data;
}

export async function listRequests(status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') {
  const { data } = await api.get('/requests', { params: { status } });
  return data as AccessRequest[];
}
