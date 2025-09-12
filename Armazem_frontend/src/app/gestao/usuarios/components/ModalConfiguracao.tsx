'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/services/api';

type Estoque = { id: number; nome: string };
type EstoquesResponse = Estoque[] | { items: Estoque[] };
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

  const canSelect = useMemo(() => !!selectedEstoqueId, [selectedEstoqueId]);
  const canSaveChat = useMemo(() => !!selectedEstoqueId && !!chatId.trim(), [selectedEstoqueId, chatId]);
  const canTest = canSaveChat;

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingList(true);
        const { data } = await api.get<EstoquesResponse>('/estoques/disponiveis', { signal: ctrl.signal, withCredentials: true });
        const items: Estoque[] = Array.isArray(data) ? data : ('items' in data ? data.items : []);
        setEstoques(items);
        setSelectedEstoqueId(items[0]?.id ?? null);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          toast.error(getErr(e, 'Falha ao carregar estoques'));
          setEstoques([]);
          setSelectedEstoqueId(null);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoadingList(false);
      }
    })();
    return () => ctrl.abort();
  }, [open]);

  useEffect(() => {
    if (!selectedEstoqueId) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const chatRes = await api.get<{ chatId: string | null }>(
          `/estoques/${selectedEstoqueId}/notify/telegram`,
          { signal: ctrl.signal, withCredentials: true }
        );
        setChatId(chatRes.data?.chatId ?? '');
      } catch {
        setChatId('');
      }
      try {
        const roleRes = await api.get<{ role: 'ADMIN' | 'MEMBER' | null; inherited?: boolean }>(
          `/admin/usuarios/${userId}/estoques/${selectedEstoqueId}/role`,
          { signal: ctrl.signal, withCredentials: true }
        );
        setRole(roleRes.data?.role ?? '');
      } catch {
        setRole('');
      }
    })();
    return () => ctrl.abort();
  }, [selectedEstoqueId, userId]);

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

  async function handleSalvarTelegram() {
    if (!selectedEstoqueId || !chatId.trim()) return;
    setLoadingSaveChat(true);
    try {
      await api.post(
        `/estoques/${selectedEstoqueId}/notify/telegram`,
        { chatId: chatId.trim() },
        { withCredentials: true }
      );
      toast.success('Chat do Telegram salvo!');
    } catch (e) {
      toast.error(getErr(e, 'Não foi possível salvar o chat do Telegram'));
    } finally {
      setLoadingSaveChat(false);
    }
  }

  async function handleTesteEnvio() {
    if (!selectedEstoqueId || !chatId.trim()) return;
    setLoadingTest(true);
    try {
      await api.post(
        `/estoques/${selectedEstoqueId}/notify/telegram/test`,
        {},
        { withCredentials: true }
      );
      toast.success('Mensagem de teste enviada!');
    } catch (e) {
      toast.error(getErr(e, 'Falha ao enviar mensagem de teste'));
    } finally {
      setLoadingTest(false);
    }
  }

  async function handleSalvarRole() {
    if (!selectedEstoqueId || !role) return;
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
        </DialogHeader>

        <div className="space-y-2">
          <Label>Estoque</Label>
          <Select
            value={selectedEstoqueId ? String(selectedEstoqueId) : ''}
            onValueChange={(v) => setSelectedEstoqueId(Number(v))}
            disabled={loadingList || estoques.length === 0}
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
            <p className="text-xs text-muted-foreground">Nenhum estoque disponível.</p>
          )}
        </div>

        <Separator className="my-2" />

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
                disabled={!canSelect}
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

        <div className="space-y-3">
          <div className="font-medium">Permissões no estoque</div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label htmlFor="role">Papel</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as Papel)}
                disabled={!canSelect}
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
              disabled={!role || !canSelect || loadingRole}
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
