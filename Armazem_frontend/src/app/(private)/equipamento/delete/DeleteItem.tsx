'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deleteSchema, DeleteFormData } from './schema';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import Sidebar from '../../components/Sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { useIsClient } from '@/hooks/useIsClient';
import withAuth from '../../components/withAuth';

const DeleteItem = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const MySwal = withReactContent(Swal);
  const { logout } = useAuth();
  const isClient = useIsClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeleteFormData>({
    resolver: zodResolver(deleteSchema),
  });

  if (!isClient) return null; // Renderiza null no server-side

  const onSubmit = async (data: DeleteFormData) => {
    setLoading(true);
    try {
      // Confirmação antes de deletar
      const result = await MySwal.fire({
        title: 'Tem certeza?',
        text: `Você realmente deseja deletar o equipamento ID: ${data.id}? Esta ação é irreversível!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, deletar!',
        cancelButtonText: 'Cancelar',
        background: '#0b0b0b',
        color: '#e5e7eb'
      });

      if (result.isConfirmed) {
        await api.delete(`/equipment/deletar/${data.id}`);
        await MySwal.fire({
          icon: 'success',
          title: 'Deletado!',
          text: `Equipamento ID: ${data.id} deletado com sucesso.`,
          timer: 2000,
          showConfirmButton: false,
          background: '#0b0b0b',
          color: '#e5e7eb'
        });
        router.push('/home');
      } else {
        // Se o usuário cancelou
        MySwal.fire({
          icon: 'info',
          title: 'Cancelado',
          text: 'A operação de deleção foi cancelada.',
          timer: 1500,
          showConfirmButton: false,
          background: '#0b0b0b',
          color: '#e5e7eb'
        });
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.message || 'Erro desconhecido ao deletar.';
      MySwal.fire({
        icon: 'error',
        title: 'Erro!',
        text: `Falha ao deletar equipamento. ${errorMsg}`,
        background: '#0b0b0b',
        color: '#e5e7eb'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    // Container principal: Define o fundo base (claro ou escuro)
    <div className="min-h-screen relative overflow-hidden bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">

      <div
        className="fixed inset-0 z-0 animate-starfield opacity-40 dark:opacity-70"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.7) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          backgroundColor: 'transparent',
        }}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      <main
        className={`relative z-10 transition-all duration-300 px-4 sm:px-8 py-12 flex justify-center bg-transparent ${sidebarCollapsed ? 'ml-16' : 'ml-60'
          }`}
      >
        <Card className="w-full max-w-lg bg-card/90 dark:bg-card/85 backdrop-blur-lg border border-border dark:border-red-800/50 shadow-xl rounded-xl overflow-hidden">

          <CardHeader className="flex flex-row items-center justify-between p-6 bg-gradient-to-r from-muted/50 to-transparent dark:from-red-950/40 dark:to-transparent border-b border-border dark:border-red-800/40">
            <div className="space-y-1">
              <nav className="flex items-center text-xs sm:text-sm text-muted-foreground">
                <a href="/home" className="hover:text-primary transition-colors">Dashboard</a>
                <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                <span className="font-medium text-destructive">Deletar Equipamento</span>
              </nav>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Trash2 className="w-6 h-6 sm:w-7 sm:h-7 text-destructive" /> Deletar Item por ID
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="id" className="text-sm font-medium text-foreground/80">ID do Equipamento</Label>
                <Input
                  id="id"
                  type="text"
                  {...register("id")}
                  placeholder="Digite o ID numérico do item a ser deletado"
                  className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-destructive ring-offset-background placeholder:text-muted-foreground"
                />
                {errors.id && (
                  <p className="text-destructive text-xs mt-1">{errors.id.message}</p>
                )}
              </div>

              {/* Botão Deletar */}
              <Button
                type="submit"
                variant="destructive"
                className="w-full text-base sm:text-lg py-2.5 sm:py-3 mt-4 font-semibold transition-all duration-300 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.01]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background"
                disabled={loading}>

                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 mr-2" /> Deletar Equipamento
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default withAuth(DeleteItem);