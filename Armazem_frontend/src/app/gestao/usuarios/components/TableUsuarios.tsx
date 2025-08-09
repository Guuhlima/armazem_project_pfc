'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  permissoes: string[];
}

interface TableUsuarioProps {
  usuarios: Usuario[];
}

const TableUsuario = ({ usuarios }: TableUsuarioProps) => {
  const { hasPermission } = useAuth();

  return (
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
          {usuarios.map((usuario, index) => (
            <motion.tr
              key={usuario.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="hover:bg-muted/50 transition-colors"
            >
              <td className="px-4 py-3">{usuario.nome}</td>
              <td className="px-4 py-3">{usuario.email}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {usuario.permissoes.join(', ')}
              </td>
              <td className="px-4 py-3 space-x-2">
                <Button variant="secondary" size="sm">
                  Editar
                </Button>
                {hasPermission(['SUPER-ADMIN']) && (
                  <Button variant="destructive" size="sm">
                    Excluir
                  </Button>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};

export default TableUsuario;
