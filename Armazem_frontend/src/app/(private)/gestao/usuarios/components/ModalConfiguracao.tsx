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

type Estoque = { id: number; nome: string };
type Role = { id: number; nome: string };

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

  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [roleInherited, setRoleInherited] = useState(false);

  const [chatId, setChatId] = useState('');

  const [loadingList, setLoadingList] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingSaveChat, setLoadingSaveChat] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);

  const hasSelection = selectedEstoqueId != null;
  const canSaveChat = useMemo(() => hasSelection && !!chatId.trim(), [hasSelection, chatId]);
  const canTest = canSaveChat;

  // 0) Carregar catálogo de roles quando abrir
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingRoles(true);
        const { data } = await api.get<{ items: Role[] }>(
          `/admin/roles`,
          { signal: ctrl.signal, withCredentials: true }
        );
        setRoles(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          console.error('Erro ao carregar catálogo de roles:', e);
          toast.error(getErr(e, 'Falha ao carregar papéis'));
          setRoles([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoadingRoles(false);
      }
    })();
    return () => ctrl.abort();
  }, [open]);

  // 1) Buscar estoques vinculados
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

  // 2) Ao trocar de estoque, buscar chatId e roleId atual
  useEffect(() => {
    if (!selectedEstoqueId) return;
    const ctrl = new AbortController();

    (async () => {
      const estoqueId = selectedEstoqueId;

      try {
        const chatRes = await api.get<{ chatId: string | null }>(
          `/estoques/${estoqueId}/notify/telegram`,
          { signal: ctrl.signal, withCredentials: true }
        );
        setChatId(chatRes.data?.chatId ?? '');
      } catch {
        setChatId('');
      }

      try {
        // backend agora devolve { roleId, roleName, inherited }
        const roleRes = await api.get<{ roleId: number | null; roleName: string | null; inherited?: boolean }>(
          `/admin/usuarios/${userId}/estoques/${estoqueId}/role`,
          { signal: ctrl.signal, withCredentials: true }
        );
        setRoleId(roleRes.data?.roleId ?? null);
        setRoleInherited(!!roleRes.data?.inherited);
      } catch {
        setRoleId(null);
        setRoleInherited(false);
      }
    })();

    return () => ctrl.abort();
  }, [selectedEstoqueId, userId]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setEstoques([]);
      setSelectedEstoqueId(null);
      setChatId('');
      setRoleId(null);
      setRoleInherited(false);
      setLoadingList(false);
      setLoadingRoles(false);
      setLoadingSaveChat(false);
      setLoadingTest(false);
      setLoadingRole(false);
    }
  }, [open]);

  // --- Handlers ---
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
    try {
      await api.post(
        `/estoques/${String(selectedEstoqueId)}/notify/telegram/test`,
        {},
        { withCredentials: true }
      );
      toast.success('Mensagem de teste enviada!');
    } catch (e: any) {
      const s = e?.response?.status;
      const d = e?.response?.data;
      if (s === 404) toast.error('Endpoint não encontrado. Verifique a URL e as rotas do servidor.');
      else if (s === 401) toast.error('Sessão expirada.');
      else if (s === 403) toast.error('Sem permissão.');
      else toast.error(d?.error || 'Falha ao enviar mensagem de teste');
    } finally {
      setLoadingTest(false);
    }
  }

  async function handleSalvarRole() {
    if (!hasSelection) return;
    setLoadingRole(true);
    try {
      // envia { roleId } — se roleId for null, limpa e passa a herdar
      await api.put(
        `/admin/usuarios/${userId}/estoques/${selectedEstoqueId}/role`,
        { roleId: roleId ?? null },
        { withCredentials: true }
      );
      toast.success('Permissão atualizada!');
      // se setou explicitamente um roleId, não é herdado
      setRoleInherited(roleId == null ? roleInherited : false);
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
              href="https://web.telegram.org/k/#@ARMAZEMG3_BOT"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
              title="@ARMAZEMG3_BOT"
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

        <div className="space-y-3">
          <div className="font-medium">Permissões no estoque</div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label htmlFor="role">Papel</Label>
              <Select
                value={roleId != null ? String(roleId) : ''}
                onValueChange={(v) => setRoleId(Number(v))}
                disabled={!hasSelection || loadingRoles}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={loadingRoles ? 'Carregando papéis...' : 'Selecione um papel'} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.nome}</SelectItem>
                  ))}
                  {/* opção para limpar (herdar) */}
                  <SelectItem value="null">— Limpar e herdar —</SelectItem>
                </SelectContent>
              </Select>
              {roleId == null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Nenhum papel definido neste estoque.
                </p>
              )}
              {roleInherited && (
                <p className="mt-1 text-xs text-blue-600">
                  Papel herdado de role global (ex.: <b>SUPER-ADMIN</b>).
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={handleSalvarRole}
              disabled={!hasSelection || loadingRole}
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
