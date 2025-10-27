'use client';

import { useState } from 'react';
import Sidebar from 'app/components/Sidebar';
import TableUsuario from './components/TableUsuarios';
import { Card, CardContent } from '@/components/ui/card';

const UsuariosPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
            <TableUsuario />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UsuariosPage;
