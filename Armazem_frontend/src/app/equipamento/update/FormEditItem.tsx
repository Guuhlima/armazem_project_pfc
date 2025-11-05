'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemEditSchema, ItemEditFormData } from "./schema"; 
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/services/api"; 
import Sidebar from '../../components/Sidebar'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, Pencil, Loader2 } from 'lucide-react'; 
import { useIsClient } from '@/hooks/useIsClient';
import { Separator } from "@/components/ui/separator";

const FormEditItem = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string; 
  const MySwal = withReactContent(Swal);
  const { logout } = useAuth(); 
  const isClient = useIsClient();

  const [loading, setLoading] = useState(true); 
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    register,
    handleSubmit,
    setValue, 
    formState: { errors },
  } = useForm<ItemEditFormData>({
    resolver: zodResolver(itemEditSchema),
  });

  useEffect(() => {
    if (!id || !isClient) return;

    const fetchItem = async () => {
      setLoading(true); 
      try {
        const res = await api.get(`/equipment/visualizar/${id}`); 
        const { nome, equipamento, quantidade, data } = res.data;

        setValue("equipamento", nome || equipamento || ''); 
        setValue("quantidade", quantidade ? String(quantidade) : '0'); 
        setValue("data", data?.slice(0, 10) || ''); 
        
      } catch (err: any) {
        console.error("Erro ao buscar item:", err);
        MySwal.fire({
            icon: 'error',
            title: 'Erro ao Buscar',
            text: `Não foi possível carregar o item ID: ${id}. ${err.response?.data?.error || ''}`,
            background: '#0b0b0b',
            color: '#e5e7eb'
        });
        router.push('/home'); // Volta se não conseguir carregar
      } finally {
        setLoading(false); 
      }
    };

    fetchItem();
  }, [id, setValue, isClient, router, MySwal]); // Dependências

  if (!isClient) return null;

  const onSubmit = async (data: ItemEditFormData) => {
    setLoading(true); 
    try {
      const payload = {
        ...data,
        quantidade: Number(data.quantidade) 
      };

      await api.put(`/equipment/editar/${id}`, payload); 

      await MySwal.fire({
        icon: 'success',
        title: 'Atualizado!',
        text: 'Equipamento atualizado com sucesso!',
        timer: 2000,
        showConfirmButton: false,
        background: '#0b0b0b',
        color: '#e5e7eb'
      });
      
      router.push('/home'); // Volta para a home

    } catch (err: any) {
      console.error("Erro ao atualizar item:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Erro desconhecido.';
      MySwal.fire({
        icon: 'error',
        title: 'Falha ao Atualizar',
        text: `Erro: ${errorMsg}`,
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
    // Container principal 
    <div className="min-h-screen relative overflow-hidden bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">

      <div
        className="fixed inset-0 z-0 animate-starfield opacity-40 dark:opacity-70 bg-zinc-100 dark:bg-black"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.7) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
      
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} onLogout={function (): void {
          throw new Error("Function not implemented.");
        } }    
      />

      <main
        className={`relative z-10 transition-all duration-300 px-4 sm:px-8 py-12 flex justify-center bg-transparent ${ 
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Card className="w-full max-w-lg bg-card/90 dark:bg-card/85 backdrop-blur-lg border border-border dark:border-blue-800/50 shadow-xl rounded-xl overflow-hidden">
          
          <CardHeader className="flex flex-row items-center justify-between p-6 bg-gradient-to-r from-muted/50 to-transparent dark:from-blue-950/40 dark:to-transparent border-b border-border dark:border-blue-800/40">
            <div className="space-y-1">
              <nav className="flex items-center text-xs sm:text-sm text-muted-foreground">
                <a href="/home" className="hover:text-primary transition-colors">Dashboard</a>
                <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                <span className="font-medium text-primary">Editar Equipamento</span>
              </nav>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Pencil className="w-6 h-6 sm:w-7 sm:h-7 text-primary" /> Editar Item (ID: {id})
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground h-40">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Carregando dados do item...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="equipamento" className="text-sm font-medium text-foreground/80">Nome do Equipamento</Label>
                  <Input
                    id="equipamento"
                    {...register("equipamento")}
                    className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-primary ring-offset-background placeholder:text-muted-foreground"
                  />
                  {errors.equipamento && <p className="text-destructive text-xs mt-1">{errors.equipamento.message}</p>}
                </div>

                <div>
                  <Label htmlFor="quantidade" className="text-sm font-medium text-foreground/80">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min={0}
                    {...register("quantidade")}
                    className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-primary ring-offset-background placeholder:text-muted-foreground"
                  />
                  {errors.quantidade && <p className="text-destructive text-xs mt-1">{errors.quantidade.message}</p>}
                </div>
                
                <div>
                  <Label htmlFor="data" className="text-sm font-medium text-foreground/80">Data de Registro (Opcional)</Label>
                  <Input
                    id="data"
                    type="date"
                    {...register("data")}
                    className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-primary ring-offset-background appearance-none"
                  />
                  {errors.data && <p className="text-destructive text-xs mt-1">{errors.data.message}</p>}
                </div>

                <Separator className="!my-6" />

                <Button
                  type="submit"
                  className="w-full text-base sm:text-lg py-2.5 sm:py-3 mt-4 bg-primary hover:bg-primary/90 text-primary-foreground
                             font-semibold transition-all duration-300 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.01]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  disabled={loading} // Desabilita durante o submit
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin"/> Salvando...
                    </>
                  ) : 'Atualizar Equipamento'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

import withAuth from '../../components/withAuth';
export default withAuth(FormEditItem);