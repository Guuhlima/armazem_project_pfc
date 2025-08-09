'use client';

import React, { useEffect, useState } from 'react';
import withAuth from '../components/withAuth';
import api from '@/services/api';
import Sidebar from '../components/Sidebar';
import TableEquipamentos from '../components/TableEquipamentos';
import { Card, CardContent } from '@/components/ui/card';
import { PackageCheck, Plus, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Home = () => {
  const [equipamentos, setEquipamentos] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchItem = async () => {
      const response = await api.get('/equipment/visualizar');
      setEquipamentos(response.data);
    };
    fetchItem();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white transition-colors">
      <Sidebar
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      <main
        className={`transition-all duration-300 p-6 pt-4 space-y-6 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm text-zinc-500">Total Equipamentos</h3>
                <p className="text-2xl font-bold mt-1 text-blue-600">{equipamentos.length}</p>
              </div>
              <PackageCheck className="w-6 h-6 text-blue-500" />
            </CardContent>
          </Card>

          <Card
            onClick={() => router.push('/equipamento/create')}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow hover:cursor-pointer hover:shadow-lg transition"
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm text-zinc-500">Novo Equipamento</h3>
                <p className="text-2xl font-bold mt-1 text-green-500">Criar</p>
              </div>
              <Plus className="w-6 h-6 text-green-500" />
            </CardContent>
          </Card>

          <Card
            onClick={() => router.push('/equipamento/get')}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow hover:cursor-pointer hover:shadow-lg transition"
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm text-zinc-500">Relatórios</h3>
                <p className="text-2xl font-bold mt-1 text-purple-500">Ver</p>
              </div>
              <FileText className="w-6 h-6 text-purple-500" />
            </CardContent>
          </Card>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Últimos Equipamentos</h2>
          <TableEquipamentos data={equipamentos} />
        </section>
      </main>
    </div>
  );
};

export default withAuth(Home);
