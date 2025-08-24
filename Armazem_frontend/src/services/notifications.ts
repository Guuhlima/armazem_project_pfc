import { api } from '@/services/api';

export type Notification = {
  id: number;
  userId: number;
  type: 'ACCESS_REQUEST' | 'ACCESS_APPROVED' | 'ACCESS_REJECTED' | string;
  title: string;
  message: string;
  refId?: number | null;
  readAt?: string | null;
  createdAt: string;
};

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count');
  return data.count ?? 0;
}

export async function listNotifications(cursor?: number, take = 20): Promise<{
  items: Notification[];
  nextCursor: number | null;
}> {
  const { data } = await api.get('/notifications', { params: { cursor, take } });
  return data;
}

export async function markAsRead(id: number) {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllRead() {
  await api.post('/notifications/read-all');
}
