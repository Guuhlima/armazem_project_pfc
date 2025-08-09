'use client';

import { useEffect, useState } from 'react';
import Sidebar from 'app/components/Sidebar';
import TableUsuario from './components/TableUsuarios';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  permissoes: string[];
}

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { hasPermission } = useAuth();

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const res = await api.get('/user/visualizar');
        setUsuarios(res.data);
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
      }
    };

    fetchUsuarios();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }}
      />

      <main className={`transition-all duration-300 px-4 sm:px-8 py-12 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <Card className="w-full max-w-5xl mx-auto">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-2xl font-bold mb-4">Gestão de Usuários</h2>
              <TableUsuario usuarios={usuarios} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UsuariosPage;
