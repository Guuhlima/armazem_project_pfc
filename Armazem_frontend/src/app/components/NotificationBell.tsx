// src/components/NotificationBell.tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import Link from 'next/link';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { items, unread, loading, cursor, load, loadMore, markOne, markAll } = useNotifications(30000);

  useEffect(() => setMounted(true), []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      computePosition();
    }
  };

  // fecha ao clicar fora / Esc
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current || !btnRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      if (btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // calcula posição do dropdown (para fora do aside)
  const computePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const panelWidth = 320; // ~w-80
    const gap = 8;

    // abre PARA A DIREITA do botão (fora do aside)
    let left = rect.right + gap;

    // se estourar a tela, recua para caber
    const maxLeft = window.innerWidth - panelWidth - gap;
    if (left > maxLeft) left = Math.max(gap, maxLeft);

    const top = Math.max(gap, Math.min(rect.top, window.innerHeight - 400)); // 400 ~ max height do painel
    setPos({ top, left, width: panelWidth });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onWin = () => computePosition();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        className="relative p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[10px] bg-red-600 text-white rounded-full px-1.5 py-0.5">
            {unread}
          </span>
        )}
      </button>

      {/* painel via portal – não fica preso ao clipping do <aside> */}
      {mounted && open && pos && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 1000,
          }}
          className="mt-2 max-h-96 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg"
        >
          <div className="p-2 text-sm font-semibold border-b dark:border-zinc-700 flex items-center justify-between">
            <span>Notificações</span>
            <button className="text-xs text-blue-600 hover:underline" onClick={markAll}>
              Marcar todas como lidas
            </button>
          </div>

          {loading && items.length === 0 && (
            <div className="p-3 text-sm text-zinc-500">Carregando…</div>
          )}

          {!loading && items.length === 0 && (
            <div className="p-3 text-sm text-zinc-500">Sem notificações</div>
          )}

          {items.map((n) => (
            <div key={n.id} className="p-3 border-b last:border-0 dark:border-zinc-800">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-zinc-500">{n.message}</div>

              <div className="mt-2 flex items-center gap-2">
                {!n.readAt && (
                  <button className="text-xs text-blue-600 hover:underline" onClick={() => markOne(n.id)}>
                    Marcar como lida
                  </button>
                )}
                {n.type === 'ACCESS_REQUEST' && n.refId && (
                  <Link href={`/gestao/solicitacoes/${n.refId}`} className="text-xs text-green-600 hover:underline">
                    Abrir
                  </Link>
                )}
              </div>

              <div className="mt-1 text-[10px] text-zinc-500">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))}

          {cursor && (
            <button
              onClick={loadMore}
              className="w-full p-2 text-center text-sm text-blue-600 hover:underline disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Carregando…' : 'Carregar mais'}
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
