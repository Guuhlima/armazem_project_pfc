'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deleteSchema, DeleteFormData } from './schema';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

const DeleteItem = () => {
  const [message, setMessage] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeleteFormData>({
    resolver: zodResolver(deleteSchema),
  });

  const onSubmit = async (data: DeleteFormData) => {
    try {
      await api.delete(`/equipment/deletar/${data.id}`);
      setMessage("Equipamento deletado com sucesso!");
      setTimeout(() => router.push('/home'), 2000);
    } catch (err) {
      console.error(err);
      setMessage("Erro ao deletar equipamento.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto">
      <div>
        <label className="block font-medium">ID do Equipamento</label>
        <input
          type="text"
          {...register("id")}
          className="w-full border p-2 rounded  text-gray-900"
        />
        {errors.id && (
          <p className="text-red-500 text-sm">{errors.id.message}</p>
        )}
      </div>

      <button type="submit" className="bg-red-600 text-white py-2 px-4 rounded w-full">
        Deletar
      </button>

      {message && (
        <p
          className={`mt-4 text-center ${
            message.includes("sucesso") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
};

export default DeleteItem;
