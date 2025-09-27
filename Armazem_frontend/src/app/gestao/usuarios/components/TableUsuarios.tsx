'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import ConfigUsuarioDialog from './ModalConfiguracao';
import { api } from '@/services/api';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { Pencil, Settings, Trash2 } from 'lucide-react';

interface Usuario {
  id: number;
  nome: string | null;
  email: string;
  permissoes: string[];
}

const TableUsuario = () => {
  const { hasPermission } = useAuth();
  const [openConfigId, setOpenConfigId] = useState<number | null>(null);

  const [rows, setRows] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isSuper = hasPermission(['SUPER-ADMIN']);
  const isAdmin = !isSuper && hasPermission(['ADMIN']);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<Usuario[]>('/user/visualizar', { withCredentials: true });
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast.error('Falha ao carregar usuários');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const canConfigure = useMemo(() => {
    return (target: Usuario) => {
      if (isSuper) return true;
      if (isAdmin) return true;
      return false;
    };
  }, [isSuper, isAdmin]);

  const canDeleteUser = useMemo(() => {
    return (target: Usuario) => {
      if (isSuper) return true;
      if (isAdmin) {
        const alvoEhSuper = (target.permissoes ?? []).includes('SUPER-ADMIN');
        return !alvoEhSuper;
      }
      return false;
    };
  }, [isSuper, isAdmin]);

  // SweetAlert2 com classes Tailwind semelhantes ao shadcn
  const swal = Swal.mixin({
    buttonsStyling: false,
    customClass: {
      popup:
        'rounded-2xl border border-border bg-background text-foreground shadow-xl',
      title: 'text-lg font-semibold',
      htmlContainer: 'text-sm text-muted-foreground',
      confirmButton:
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90',
      cancelButton:
        'ml-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80',
      icon: 'border border-border rounded-full',
    },
  });

  const handleDelete = async (id: number) => {
    const alvo = rows.find(r => r.id === id);
    const nomeOuEmail = alvo?.nome || alvo?.email || `ID ${id}`;

    const result = await swal.fire({
      title: 'Excluir usuário?',
      text: `Tem certeza que deseja excluir o usuário "${nomeOuEmail}"? Essa ação não pode ser desfeita.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    setDeletingId(id);

    const snapshot = [...rows];
    setRows(prev => prev.filter(u => u.id !== id));

    try {
      await api.delete(`/user/deletar/${id}`, { withCredentials: true });
      await swal.fire({
        icon: 'success',
        title: 'Usuário excluído',
        text: `"${nomeOuEmail}" foi removido com sucesso.`,
        confirmButtonText: 'OK',
      });
    } catch (error: any) {
      console.error(error);
      setRows(snapshot);
      const msg = error?.response?.data?.message || 'Falha ao excluir usuário.';
      await swal.fire({
        icon: 'error',
        title: 'Erro ao excluir',
        text: msg,
        confirmButtonText: 'OK',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-x-auto rounded-2xl shadow-lg border border-border bg-background"
      >
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Permissões</th>
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={4}>
                  Carregando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={4}>
                  Nenhum usuário para exibir.
                </td>
              </tr>
            ) : (
              rows.map((usuario, index) => {
                const showConfig = canConfigure(usuario);
                const showDelete = canDeleteUser(usuario);
                const isDeletingThis = deletingId === usuario.id;

                return (
                  <motion.tr
                    key={usuario.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`hover:bg-muted/50 transition-colors ${isDeletingThis ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">{usuario.nome ?? '—'}</td>
                    <td className="px-4 py-3">{usuario.email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {(usuario.permissoes ?? []).join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!showConfig || isDeletingThis}
                          className="inline-flex items-center gap-1"
                        >
                          <Pencil className="h-4 w-4" />
                          <span>Editar</span>
                        </Button>

                        {showConfig && (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={isDeletingThis}
                            onClick={() => setOpenConfigId(usuario.id)}
                            className="inline-flex items-center gap-1"
                          >
                            <Settings className="h-4 w-4" />
                            <span>Configurar</span>
                          </Button>
                        )}

                        {showDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeletingThis}
                            onClick={() => handleDelete(usuario.id)}
                            className="inline-flex items-center gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{isDeletingThis ? 'Excluindo...' : 'Excluir'}</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {openConfigId && (
        <ConfigUsuarioDialog
          userId={openConfigId}
          open
          onOpenChange={(v) => !v && setOpenConfigId(null)}
        />
      )}
    </>
  );
};

export default TableUsuario;