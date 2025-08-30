'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import ConfigUsuarioDialog from './ModalConfiguracao';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface Usuario {
  id: number;
  nome: string | null;
  email: string;
  permissoes: string[]; // ex.: ['ADMIN','USER-EQUIPAMENTOS']
}

const TableUsuario = () => {
  const { hasPermission } = useAuth();
  const [openConfigId, setOpenConfigId] = useState<number | null>(null);

  const [rows, setRows] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);

  // Quem está logado
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

  // Helpers de permissão por usuário alvo
  const canConfigure = useMemo(() => {
    return (target: Usuario) => {
      if (isSuper) return true;                // super pode configurar qualquer um
      if (isAdmin) return true;                // admin pode configurar qualquer um
      return false;                            // demais papéis: não podem
    };
  }, [isSuper, isAdmin]);

  const canDeleteUser = useMemo(() => {
    return (target: Usuario) => {
      if (isSuper) return true;                // super pode deletar qualquer um
      if (isAdmin) {
        // admin NÃO pode deletar SUPER-ADMIN
        const alvoEhSuper = (target.permissoes ?? []).includes('SUPER-ADMIN');
        return !alvoEhSuper;
      }
      return false;                            // demais papéis: não podem
    };
  }, [isSuper, isAdmin]);

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
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Ações</th>
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

                return (
                  <motion.tr
                    key={usuario.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">{usuario.nome ?? '—'}</td>
                    <td className="px-4 py-3">{usuario.email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {(usuario.permissoes ?? []).join(', ')}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {/* Botão Editar: se quiser, aplique mesma lógica de canConfigure */}
                      <Button variant="secondary" size="sm" disabled={!showConfig}>
                        Editar
                      </Button>

                      {showConfig && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setOpenConfigId(usuario.id)}
                        >
                          Configurar
                        </Button>
                      )}

                      {showDelete && (
                        <Button
                          variant="destructive"
                          size="sm"
                          // onClick={() => ... chamar DELETE /user/deletar/:id }
                        >
                          Excluir
                        </Button>
                      )}
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
