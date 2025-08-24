// src/hooks/useNotifications.ts
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getUnreadCount, listNotifications, markAllRead, markAsRead, type Notification } from '@/services/notifications';

export function useNotifications(pollMs = 30000) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, page] = await Promise.all([getUnreadCount(), listNotifications(undefined)]);
      setUnread(c);
      setItems(page.items);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await listNotifications(cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  const markOne = useCallback(async (id: number) => {
    await markAsRead(id);
    await load();
  }, [load]);

  const markAll = useCallback(async () => {
    await markAllRead();
    await load();
  }, [load]);

  useEffect(() => {
    load();

    if (pollMs > 0) {
      // polling leve para atualizar badge
      timer.current = window.setInterval(load, pollMs);
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [load, pollMs]);

  return { items, unread, loading, load, loadMore, markOne, markAll, cursor };
}
