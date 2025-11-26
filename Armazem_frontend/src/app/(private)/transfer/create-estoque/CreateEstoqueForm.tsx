'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEstoqueSchema, CreateEstoqueSchemaType } from './schema';
import api from '@/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function CreateEstoqueForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEstoqueSchemaType>({
    resolver: zodResolver(createEstoqueSchema),
  });

  const onSubmit = async (data: CreateEstoqueSchemaType) => {
    try {
      await api.post('/stock/cadastro', data);
      reset();

      MySwal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Estoque criado com sucesso.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      MySwal.fire({
        icon: 'error',
        title: 'Erro!',
        text: 'Não foi possível criar o estoque.',
      });
    }
  };

  return (
    <Card className="max-w-md w-full mx-auto bg-background text-foreground border border-border shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-center">Cadastrar Novo Estoque</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Estoque</label>
            <Input
              type="text"
              {...register('nome')}
              placeholder="Ex: Almoxarifado 01"
            />
            {errors.nome && (
              <p className="text-sm text-red-500 mt-1">{errors.nome.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar Estoque'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
