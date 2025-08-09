'use client';

import { useState } from 'react';
import TransferForm from './create/TransferForm';
import CreateEstoqueForm from './create-estoque/CreateEstoqueForm';
import ListEstoqueForm from './list-estoque/ListarEstoque';
import Sidebar from '../components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Boxes, PlusCircle, Repeat, ArrowLeftCircle } from 'lucide-react';
import withAuth from 'app/components/withAuth';
import { motion } from 'framer-motion';

const TransferDashboardPage = () => {
  const [view, setView] = useState<'inicio' | 'criarEstoque' | 'listarEstoques' | 'novaTransferencia'>('inicio');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('auth');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      <main className={`transition-all duration-300 p-6 pt-4 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">Painel de Transferência</h1>

          {view === 'inicio' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  label: 'Criar Estoque',
                  sub: 'Novo',
                  icon: <PlusCircle className="w-6 h-6 text-green-600" />,
                  onClick: () => setView('criarEstoque'),
                  color: 'text-green-600',
                },
                {
                  label: 'Estoques Existentes',
                  sub: 'Consultar',
                  icon: <Boxes className="w-6 h-6 text-blue-600" />,
                  onClick: () => setView('listarEstoques'),
                  color: 'text-blue-600',
                },
                {
                  label: 'Nova Transferência',
                  sub: 'Transferir',
                  icon: <Repeat className="w-6 h-6 text-purple-600" />,
                  onClick: () => setView('novaTransferencia'),
                  color: 'text-purple-600',
                },
              ].map(({ label, sub, icon, onClick, color }, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    onClick={onClick}
                    className="hover:shadow-lg hover:cursor-pointer transition border border-border bg-card"
                  >
                    <CardContent className="p-6 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm text-muted-foreground">{sub}</h3>
                        <p className={`text-xl font-semibold ${color}`}>{label}</p>
                      </div>
                      {icon}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {view === 'criarEstoque' && (
            <div className="mt-8">
              <CreateEstoqueForm />
            </div>
          )}

          {view === 'listarEstoques' && (
            <div className="mt-8">
              <ListEstoqueForm />
            </div>
          )}

          {view === 'novaTransferencia' && (
            <div className="mt-8">
              <TransferForm />
            </div>
          )}

          {view !== 'inicio' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-10 flex justify-center"
            >
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                onClick={() => setView('inicio')}
              >
                <ArrowLeftCircle className="w-5 h-5" />
                Voltar ao menu principal
              </Button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

export default withAuth(TransferDashboardPage)