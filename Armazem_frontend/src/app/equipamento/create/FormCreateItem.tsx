'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemSchema, ItemFormData } from './schema';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/services/api'; 
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, PackagePlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useIsClient } from '@/hooks/useIsClient';

interface Estoque {
  id: number;
  nome: string;
}

const FormCreateItem = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const MySwal = withReactContent(Swal);
  const { hasPermission, logout } = useAuth();
  const isClient = useIsClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
    defaultValues: {
        nome: '',
        quantidade: 0,
        minimo: 0,
        data: '',
        vincularEstoque: false,
        estoqueId: undefined,
    }
  });

  const vincularEstoque = watch('vincularEstoque');

  useEffect(() => {
    if (!isClient) return;
    async function fetchEstoques() {
     if (!hasPermission(['ADMIN', 'SUPER-ADMIN', 'USER-EQUIP-TRANSFER'])) return;
     try {
       const res = await api.get('/stock/visualizar');
       setEstoques(Array.isArray(res.data) ? res.data : []);
     } catch (error) {
       console.error('Erro ao buscar estoques:', error);
       setEstoques([]);
     }
   }
   fetchEstoques();
  }, [hasPermission, isClient]);

  if (!isClient) {
      return null;
  }

  const onSubmit = async (data: ItemFormData) => {
    if (data.vincularEstoque && (!data.estoqueId || data.estoqueId <= 0)) {
       await MySwal.fire({ 
            icon: 'warning', title: 'Campo Obrigatório',
            text: 'Selecione um estoque válido para vincular.',
            background: '#0b0b0b', 
            color: '#e5e7eb',   
            customClass: { popup: 'rounded-xl' }
          });
       return; 
    }
    const quantidade = data.quantidade ?? 0; 
    const minimo = data.minimo ?? 0;  
    if (quantidade < 0 || minimo < 0) {
        await MySwal.fire({ 
            icon: 'warning', title: 'Valores Inválidos',
            text: 'Quantidade e Mínimo não podem ser negativos.',
            background: '#0b0b0b',
            color: '#e5e7eb',
            customClass: { popup: 'rounded-xl' }
        });
        return; 
    }

    
    const equipmentPayload: any = {
        nome: data.nome,
        ...(data.data && { data: data.data }),
    }; 

    console.log("Payload para /equipment/cadastro:", JSON.stringify(equipmentPayload, null, 2)); 
    if (data.vincularEstoque) {
        console.log("Payload para /stockmovi/cadastro/...:", JSON.stringify({
             itemId: 'Será preenchido após criar',
             estoqueId: data.estoqueId,
             quantidade: quantidade,
             minimo: minimo
         }, null, 2)); 
    }

    try {
      // 1. Cria o equipamento base
      console.log("Enviando para /equipment/cadastro..."); 
      const resEquip = await api.post('/equipment/cadastro', equipmentPayload); 
      console.log("Resposta /equipment/cadastro:", resEquip); 

      const itemId = resEquip?.data?.id; 
      if (!itemId) {
        const backendError = resEquip?.data?.error || resEquip?.data?.message || "ID não retornado"; 
        throw new Error(`Falha ao obter ID do equipamento criado. Resposta: ${backendError}`); 
      }

      // 2. Vincula ao estoque, se aplicável
      if (data.vincularEstoque && data.estoqueId && quantidade >= 0 && minimo >= 0) {
        try {
          const stockPayload = { itemId: itemId, quantidade: quantidade, minimo: minimo };
          console.log(`Enviando para /stockmovi/cadastro/${data.estoqueId}/adicionar-equipamento... Payload:`, JSON.stringify(stockPayload, null, 2)); // Adicionado ;
          await api.post(`/stockmovi/cadastro/${data.estoqueId}/adicionar-equipamento`, stockPayload);
          console.log("Vínculo com estoque bem-sucedido.");
        } catch (err: any) {
          console.error('Erro DETALHADO ao vincular ao estoque:', err.response?.data || err.message); 
          await MySwal.fire({
              icon: 'warning',
              title: 'Erro ao Vincular',
              text: `O equipamento "${data.nome}" foi criado (ID: ${itemId}), mas falhou ao vincular ao estoque: ${err.response?.data?.error || err.response?.data?.message || err.message}`,
              background: '#0b0b0b',
              color: '#e5e7eb',
              customClass: { popup: 'rounded-xl' }
          }); 
        }
      }

      await MySwal.fire({
        icon: 'success',
        title: 'Operação Concluída',
        text: `Equipamento "${data.nome}" cadastrado${data.vincularEstoque ? ' e tentativa de vínculo realizada' : ''}.`,
        timer: 2500,
        showConfirmButton: false,
        background: '#0b0b0b',
        color: '#e5e7eb',
        customClass: { popup: 'rounded-xl' }
      }); 
      reset();

    } catch (err: any) { // Catch geral
      console.error("Erro ao cadastrar:", err.response?.data || err.message); 
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Erro desconhecido ao cadastrar equipamento.'; 
      await MySwal.fire({
        icon: 'error',
        title: 'Falha no Cadastro',
        text: `Erro: ${errorMsg}`,
        background: '#0b0b0b',
        color: '#e5e7eb',
        customClass: { popup: 'rounded-xl' }
      }); 
    }
  }; 


  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    api.defaults.headers.common.Authorization = '';
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">

      <div
        className="absolute inset-0 z-0 animate-starfield opacity-40 dark:opacity-70"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.7) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
        />

        <main
          className={`transition-all duration-300 px-4 sm:px-8 py-12 flex justify-center ${
            sidebarCollapsed ? 'ml-16' : 'ml-60'
          }`}
        >
          <Card className="w-full max-w-2xl bg-card/90 dark:bg-card/85 backdrop-blur-lg border border-border dark:border-blue-800/50 shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-6 bg-gradient-to-r from-muted/50 to-transparent dark:from-blue-950/40 dark:to-transparent border-b border-border dark:border-blue-800/40">
              <div className="space-y-1">
                <nav className="flex items-center text-xs sm:text-sm text-muted-foreground">
                  <a href="/home" className="hover:text-primary transition-colors">Dashboard</a>
                  <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                  <span className="font-medium text-primary">Novo Equipamento</span>
                </nav>
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <PackagePlus className="w-6 h-6 sm:w-7 sm:h-7 text-primary" /> Registrar Item
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="nome" className="text-sm font-medium text-foreground/80">Nome do Equipamento</Label>
                  <Input
                    id="nome" {...register('nome')} placeholder="Ex: Notebook DELL"
                    className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-primary ring-offset-background placeholder:text-muted-foreground"
                  />
                  {errors.nome && <p className="text-destructive text-xs mt-1">{errors.nome.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantidade" className="text-sm font-medium text-foreground/80">Quantidade Inicial {vincularEstoque ? '(no Estoque)' : ''}</Label>
                    <Input
                      id="quantidade" type="number" min={0} {...register('quantidade', { valueAsNumber: true })} placeholder="0"
                      className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-primary ring-offset-background placeholder:text-muted-foreground"
                    />
                    {errors.quantidade && <p className="text-destructive text-xs mt-1">{errors.quantidade.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="minimo" className="text-sm font-medium text-foreground/80">Mínimo {vincularEstoque ? '(no Estoque)' : ''}</Label>
                    <Input
                      id="minimo" type="number" min={0} {...register('minimo', { valueAsNumber: true })} placeholder="Ex: 2"
                       className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-primary ring-offset-background placeholder:text-muted-foreground"
                    />
                    {errors.minimo && <p className="text-destructive text-xs mt-1">{errors.minimo.message}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="data" className="text-sm font-medium text-foreground/80">Data de Registro (Opcional)</Label>
                  <Input
                    id="data" type="date" {...register('data')}
                     className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-primary ring-offset-background appearance-none"
                  />
                  {errors.data && <p className="text-destructive text-xs mt-1">{errors.data.message}</p>}
                </div>

                <Separator className="!my-6" />

                {hasPermission(['ADMIN', 'SUPER-ADMIN', 'USER-EQUIP-TRANSFER']) && (
                 <div className="space-y-4 rounded-md border border-border p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="vincularEstoque" className="text-base font-semibold text-foreground cursor-pointer">
                        Vincular e Adicionar ao Estoque Agora?
                        <p className="text-xs font-normal text-muted-foreground">
                          Se marcado, você definirá a quantidade inicial e o mínimo neste estoque.
                        </p>
                      </Label>
                      <Controller name="vincularEstoque" control={control} defaultValue={false} render={({ field }) => ( <Switch id="vincularEstoque" checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary flex-shrink-0" /> )} />
                    </div>
                    {vincularEstoque && (
                      <div className="space-y-4 pt-3 border-t border-border mt-4">
                        <div>
                          <Label htmlFor="estoqueId" className="block text-sm font-medium text-foreground/80 mb-1">Selecione o Estoque de Destino <span className="text-destructive">*</span></Label>
                          <select
                            id="estoqueId" {...register('estoqueId', { valueAsNumber: true })}
                            className="w-full border border-input rounded-md px-3 py-2 mt-1 text-base bg-background dark:bg-zinc-900 text-foreground focus:border-primary transition-colors ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive"
                            aria-invalid={!!errors.estoqueId}
                          >
                            <option value="">— Selecione —</option>
                            {estoques.map((estoque) => ( <option key={estoque.id} value={estoque.id}>{estoque.nome} (ID: {estoque.id})</option> ))}
                          </select>
                           {errors.estoqueId && <p className="text-destructive text-xs mt-1">{errors.estoqueId.message}</p>}
                        </div>
                      </div>
                    )}
                   </div>
                 )}

                <Button
                  type="submit"
                  className="w-full text-base sm:text-lg py-2.5 sm:py-3 mt-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  Cadastrar Equipamento
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default FormCreateItem;