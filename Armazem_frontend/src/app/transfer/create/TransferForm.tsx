'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transferSchema, TransferSchemaType } from './schema';
import api from '@/services/api';

interface Estoque {
  id: number;
  nome: string;
}

interface Equipamento {
  id: number;
  nome: string;
}

export default function TransferForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransferSchemaType>({
    resolver: zodResolver(transferSchema),
  });

  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [itensDisponiveis, setItensDisponiveis] = useState<Equipamento[]>([]);
  const [estoqueOrigemId, setEstoqueOrigemId] = useState<number | null>(null);
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState<number | null>(null);
  const selectedItemId = watch("itemId");

  useEffect(() => {
    async function fetchEstoques() {
      try {
        const res = await api.get('/stock/visualizar');
        setEstoques(res.data);
      } catch (error) {
        console.error('Erro ao buscar estoques', error);
      }
    }

    fetchEstoques();
  }, []);

  async function fetchItensDoEstoque(estoqueId: number) {
    try {
      const res = await api.get(`/stock/visualizar/${estoqueId}/itens`);

      const itensConvertidos = res.data.map((registro: any) => ({
        id: registro.item.id,
        nome: registro.item.nome,
      }));

      setItensDisponiveis(itensConvertidos);
    } catch (error) {
      console.error('Erro ao buscar itens do estoque', error);
    }
  }

  const handleChangeOrigem = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    console.log("Estoque selecionado:", id)
    if (!isNaN(id)) {
      setEstoqueOrigemId(id);
      fetchItensDoEstoque(id);
    } else {
      setEstoqueOrigemId(null);
      setItensDisponiveis([]);
    }
  };

  useEffect(() => {
    async function fetchQuantidadeDisponivel() {
      if (!selectedItemId || !estoqueOrigemId) {
        setQuantidadeDisponivel(null);
        return;
      }

      try {
        const res = await api.get(`/stockmovi/visualizar/${estoqueOrigemId}/itens-quantidade/${selectedItemId}`);
        setQuantidadeDisponivel(res.data.quantidade || 0);
      } catch (error) {
        console.error("Erro ao buscar quantidade do item", error);
        setQuantidadeDisponivel(null);
      }
    }

    fetchQuantidadeDisponivel();
  }, [selectedItemId, estoqueOrigemId]);

  const onSubmit = async (data: TransferSchemaType) => {
    try {
      await api.post('/transfer/cadastro', data);
      alert('Transferência realizada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar transferência.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-md mx-auto space-y-6 bg-white p-6 shadow-md rounded-lg"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estoque de Origem
        </label>
        <select
          {...register('estoqueOrigemId', { valueAsNumber: true })}
          onChange={handleChangeOrigem}
          className="w-full border border-gray-300 rounded-md p-2 text-gray-900"
        >
          <option value="">Selecione</option>
          {estoques.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
        {errors.estoqueOrigemId && (
          <p className="text-sm text-red-500 mt-1">
            {errors.estoqueOrigemId.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Equipamento
        </label>
        <select
          {...register('itemId', { valueAsNumber: true })}
          disabled={!estoqueOrigemId}
          className="w-full border border-gray-300 rounded-md p-2 text-gray-900"
        >
          <option value="">Selecione um equipamento</option>
          {itensDisponiveis.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
        {errors.itemId && (
          <p className="text-sm text-red-500 mt-1">
            {errors.itemId.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estoque de Destino
        </label>
        <select
          {...register('estoqueDestinoId', { valueAsNumber: true })}
          disabled={!estoqueOrigemId}
          className="w-full border border-gray-300 rounded-md p-2 text-gray-900"
        >
          <option value="">Selecione</option>
          {estoques
            .filter((e) => e.id !== estoqueOrigemId)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
        </select>
        {errors.estoqueDestinoId && (
          <p className="text-sm text-red-500 mt-1">
            {errors.estoqueDestinoId.message}
          </p>
        )}
      </div>

      {quantidadeDisponivel !== null && (
        <div className='text-sm text-gray-600 dark:text-gray-300'>
          Quantidade disponível: <strong>{quantidadeDisponivel}</strong>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantidade
        </label>
        <input
          type="number"
          {...register('quantidade', { valueAsNumber: true })}
          disabled={!estoqueOrigemId}
          className="w-full border border-gray-300 rounded-md p-2 text-gray-900"
        />
        {errors.quantidade && (
          <p className="text-sm text-red-500 mt-1">
            {errors.quantidade.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!estoqueOrigemId}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
      >
        Transferir
      </button>
    </form>
  );
}
