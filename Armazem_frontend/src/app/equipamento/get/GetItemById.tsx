'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSchema, GetFormData } from './schema';
import { useState } from 'react';
import api from '@/services/api';

const GetItemById = () => {
  const [item, setItem] = useState<any | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GetFormData>({
    resolver: zodResolver(getSchema),
  });

  const onSubmit = async (data: GetFormData) => {
    try {
      const response = await api.get(`/equipment/visualizar/${data.id}`);
      setItem(response.data);
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar equipamento');
      setItem(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto">
      <div>
        <label className="block font-medium">ID do Equipamento</label>
        <input
          type="text"
          {...register('id')}
          className="w-full border p-2 rounded text-gray-900"
        />
        {errors.id && (
          <p className="text-red-500 text-sm">{errors.id.message}</p>
        )}
      </div>

      <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded w-full">
        Consultar
      </button>

      {item && (
        <div className="mt-6 bg-white p-4 rounded shadow text-sm text-gray-800">
          <p><strong>Equipamento:</strong> {item.equipamento}</p>
          <p><strong>Quantidade:</strong> {item.quantidade}</p>
          <p><strong>Data:</strong> {item.data}</p>
        </div>
      )}
    </form>
  );
};

export default GetItemById;
