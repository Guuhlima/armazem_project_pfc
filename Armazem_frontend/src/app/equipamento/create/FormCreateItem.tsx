'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemSchema, ItemFormData } from './schema';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Controller } from "react-hook-form";
import { Card, CardContent } from '@/components/ui/card';
import api from '@/services/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/contexts/AuthContext';

interface Estoque {
  id: number;
  nome: string;
}

const FormCreateItem = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const MySwal = withReactContent(Swal);
  const { hasPermission } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
  });


  const vincularEstoque = watch('vincularEstoque');

  useEffect(() => {
    async function fetchEstoques() {

      if (!hasPermission(['ADMIN', 'SUPER-ADMIN', 'USER-EQUIP-TRANSFER'])) return;

      try {
        const res = await api.get('/stock/visualizar');
        setEstoques(res.data);
      } catch (error) {
        console.error('Erro ao buscar estoques:', error);
      }
    }

    fetchEstoques();
  }, [hasPermission]);

  const onSubmit = async (data: ItemFormData) => {
    try {
      const res = await api.post('/equipment/cadastro', {
        nome: data.nome,
        quantidade: data.quantidade,
        data: data.data,
      });

      const itemId = res?.data?.id;
      const estoqueId = data.estoqueId;
      const quantidade = data.quantidade;

      if (data.vincularEstoque && estoqueId && itemId && quantidade > 0) {
        try {
          await api.post(`/stockmovi/cadastro/${estoqueId}/adicionar-equipamento`, {
            itemId,
            quantidade,
          });
        } catch (err) {
          console.error('Erro ao vincular ao estoque:', err);
          MySwal.fire({
            icon: 'error',
            title: 'Erro ao vincular',
            text: 'O equipamento foi criado, mas não foi vinculado ao estoque.',
          });
          return;
        }
      }

      MySwal.fire({
        icon: 'success',
        title: 'Cadastrado!',
        text: 'Equipamento cadastrado com sucesso!',
        timer: 2000,
        showConfirmButton: false,
      });

      reset();
    } catch (err) {
      console.error(err);
      MySwal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao cadastrar equipamento.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={() => {
          localStorage.removeItem('auth');
          window.location.href = '/';
        }}
      />

      <main
        className={`transition-all duration-300 px-4 sm:px-8 py-12 flex justify-center ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Card className="w-full max-w-2xl bg-background border border-border shadow-lg rounded-2xl">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-3xl font-bold text-center">Cadastrar Equipamento</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Equipamento</label>
                <Input {...register('nome')} placeholder="Ex: Notebook" />
                {errors.nome && (
                  <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantidade</label>
                <Input
                  type="number"
                  {...register('quantidade', { valueAsNumber: true })}
                  placeholder="Ex: 10"
                />
                {errors.quantidade && (
                  <p className="text-red-500 text-sm mt-1">{errors.quantidade.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <Input type="date" {...register('data')} />
                {errors.data && (
                  <p className="text-red-500 text-sm mt-1">{errors.data.message}</p>
                )}
              </div>

              {hasPermission(['ADMIN', 'SUPER-ADMIN', 'USER-EQUIP-TRANSFER']) && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vincularEstoque" className="text-sm font-medium">
                      Vincular a um estoque
                    </Label>
                    <Controller
                      name="vincularEstoque"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="vincularEstoque"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>

                  {vincularEstoque && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Estoque</label>
                      <select
                        {...register('estoqueId', { valueAsNumber: true })}
                        className="w-full border border-input rounded-md px-3 py-2 mt-1 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                      >
                        <option value="">Selecione um estoque</option>
                        {estoques.map((estoque) => (
                          <option key={estoque.id} value={estoque.id}>
                            {estoque.nome}
                          </option>
                        ))}
                      </select>
                      {errors.estoqueId && (
                        <p className="text-red-500 text-sm mt-1">{errors.estoqueId.message}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <Button type="submit" className="w-full text-base">
                Cadastrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FormCreateItem;
