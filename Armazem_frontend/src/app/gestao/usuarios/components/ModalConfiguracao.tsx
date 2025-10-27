'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/services/api';

type Estoque = { id: number; nome: string; role?: string | null };
type Papel = 'ADMIN' | 'MEMBER';

interface Props {
  userId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErr(e: unknown, fallback = 'Ocorreu um erro') {
  const any = e as any;
  return any?.response?.data?.error || any?.message || fallback;
}

export default function ConfigUsuarioDialog({ userId, open, onOpenChange }: Props) {
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [selectedEstoqueId, setSelectedEstoqueId] = useState<number | null>(null);

  const [chatId, setChatId] = useState('');
  const [role, setRole] = useState<Papel | ''>('');

  const [loadingList, setLoadingList] = useState(false);
  const [loadingSaveChat, setLoadingSaveChat] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);

  const hasSelection = selectedEstoqueId != null;
  const canSaveChat = useMemo(() => hasSelection && !!chatId.trim(), [hasSelection, chatId]);
  const canTest = canSaveChat;

  // 🔹 1) Buscar estoques vinculados ao usuário (rota nova /admin/usuarios/:userId/estoques)
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoadingList(true);
        const { data } = await api.get<{ items: Estoque[] }>(
          `/admin/usuarios/${userId}/estoques`,
          { signal: ctrl.signal, withCredentials: true }
        );

        const items = Array.isArray(data?.items) ? data.items : [];
        setEstoques(items);

        if (items.length === 0) {
          toast.info('Nenhum estoque vinculado a este usuário.');
          setSelectedEstoqueId(null);
          return;
        }

        // Se o usuário tem mais de um estoque, seleciona o primeiro automaticamente
        setSelectedEstoqueId(items[0].id);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          console.error('Erro ao buscar estoques vinculados:', e);
          toast.error(getErr(e, 'Falha ao buscar estoques do usuário.'));
          setEstoques([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoadingList(false);
      }
    })();

    return () => ctrl.abort();
  }, [open, userId]);

  // 🔹 2) Ao trocar de estoque, busca chatId e role
  useEffect(() => {
    if (!selectedEstoqueId) return;
    const ctrl = new AbortController();

    (async () => {
      const estoqueId = selectedEstoqueId;

      try {
        // ChatId global do estoque
        const chatRes = await api.get<{ chatId: string | null }>(
          `/estoques/${estoqueId}/notify/telegram`,
          { signal: ctrl.signal, withCredentials: true }
        );
        setChatId(chatRes.data?.chatId ?? '');
      } catch {
        setChatId('');
      }

      try {
        // Role do usuário no estoque
        const roleRes = await api.get<{ role: Papel | null }>(
          `/admin/usuarios/${userId}/estoques/${estoqueId}/role`,
          { signal: ctrl.signal, withCredentials: true }
        );
        setRole(roleRes.data?.role ?? '');
      } catch {
        setRole('');
      }
    })();

    return () => ctrl.abort();
  }, [selectedEstoqueId, userId]);

  // 🔹 Reset quando fechar o dialog
  useEffect(() => {
    if (!open) {
      setEstoques([]);
      setSelectedEstoqueId(null);
      setChatId('');
      setRole('');
      setLoadingList(false);
      setLoadingSaveChat(false);
      setLoadingTest(false);
      setLoadingRole(false);
    }
  }, [open]);

  // 🔹 Handlers
  async function handleSalvarTelegram() {
    if (!hasSelection || !chatId.trim()) return;
    setLoadingSaveChat(true);
    try {
      await api.post(
        `/estoques/${selectedEstoqueId}/notify/telegram`,
        { chatId: chatId.trim() },
        { withCredentials: true }
      );
      toast.success('Chat do Telegram salvo com sucesso!');
    } catch (e) {
      toast.error(getErr(e, 'Erro ao salvar chat do Telegram'));
    } finally {
      setLoadingSaveChat(false);
    }
  }

  async function handleTesteEnvio() {
    if (!hasSelection) {
      toast.error('Selecione um estoque primeiro.');
      return;
    }
    setLoadingTest(true);
    const estoqueId = String(selectedEstoqueId);

    try {
      await api.post(
        `/estoques/${estoqueId}/notify/telegram/test`,
        {},
        { withCredentials: true }
      );

      toast.success('Mensagem de teste enviada!');
    } catch (e: any) {
      const s = e?.response?.status;
      const d = e?.response?.data;
      console.error('[TESTE TELEGRAM] erro', s, d || e);

      // Agora 404 indica endpoint não encontrado (ex.: baseURL errada ou rota faltando)
      if (s === 404) toast.error('Endpoint não encontrado. Verifique a URL e as rotas do servidor.');
      else if (s === 401) toast.error('Sessão expirada.');
      else if (s === 403) toast.error('Sem permissão.');
      else toast.error(d?.error || 'Falha ao enviar mensagem de teste');
    } finally {
      setLoadingTest(false);
    }
  }

  async function handleSalvarRole() {
    if (!hasSelection || !role) return;
    setLoadingRole(true);
    try {
      await api.put(
        `/admin/usuarios/${userId}/estoques/${selectedEstoqueId}/role`,
        { role },
        { withCredentials: true }
      );
      toast.success('Permissão atualizada!');
    } catch (e) {
      toast.error(getErr(e, 'Falha ao salvar permissão'));
    } finally {
      setLoadingRole(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurar usuário #{userId}</DialogTitle>
          <DialogDescription>
            Selecione um estoque vinculado para configurar permissões e notificações.
          </DialogDescription>
        </DialogHeader>

        {/* Estoques */}
        <div className="space-y-2">
          <Label>Estoque</Label>
          <Select
            value={hasSelection ? String(selectedEstoqueId) : ''}
            onValueChange={(v) => setSelectedEstoqueId(Number(v))}
            disabled={loadingList}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingList ? 'Carregando...' : 'Selecione um estoque'} />
            </SelectTrigger>
            <SelectContent>
              {estoques.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  #{e.id} — {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loadingList && estoques.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum estoque vinculado.</p>
          )}
        </div>

        <Separator className="my-2" />

        {/* Telegram */}
        <div className="space-y-3">
          <div className="font-medium">Notificações no Telegram</div>
          <p className="text-sm text-muted-foreground">
            Abra o bot{' '}
            <a
              href="https://web.telegram.org/k/#@GSI_TESTETELEGRAM_BOT"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
              title="@GSI_TESTETELEGRAM_BOT"
            >
              ARMAZEMG3_BOT
            </a>
            , envie <code className="mx-1 rounded bg-muted px-1 py-0.5">/chatid</code> e cole o <b>chat_id</b> retornado abaixo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label htmlFor="chatId">chatId</Label>
              <Input
                id="chatId"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="ex.: 123456789 ou -100123..."
                disabled={!hasSelection}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleSalvarTelegram}
                disabled={!canSaveChat || loadingSaveChat}
              >
                {loadingSaveChat ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                onClick={handleTesteEnvio}
                disabled={!canTest || loadingTest}
              >
                {loadingTest ? 'Enviando...' : 'Enviar teste'}
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Permissões */}
        <div className="space-y-3">
          <div className="font-medium">Permissões no estoque</div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label htmlFor="role">Papel</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as Papel)}
                disabled={!hasSelection}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione um papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="MEMBER">MEMBER</SelectItem>
                </SelectContent>
              </Select>
              {!role && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Nenhum papel definido para este usuário neste estoque.
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={handleSalvarRole}
              disabled={!role || !hasSelection || loadingRole}
            >
              {loadingRole ? 'Salvando...' : 'Salvar papel'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
