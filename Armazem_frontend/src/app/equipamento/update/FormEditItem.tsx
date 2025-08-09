'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemEditSchema, ItemEditFormData } from "./schema";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/services/api";

const FormEditItem = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ItemEditFormData>({
    resolver: zodResolver(itemEditSchema),
  });

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await api.get(`/visualizar/${id}`);
        const { equipamento, quantidade, data } = res.data;

        setValue("equipamento", equipamento);
        setValue("quantidade", quantidade.toString());
        setValue("data", data?.slice(0, 10));
      } catch {
        setMessage("Erro ao buscar item.");
      }
    };

    if (id) fetchItem();
  }, [id, setValue]);

  const onSubmit = async (data: ItemEditFormData) => {
    try {
      await api.put(`/editar/${id}`, data);
      setMessage("Item atualizado com sucesso!");
      setTimeout(() => router.push("/home"), 2000);
    } catch {
      setMessage("Erro ao atualizar item.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto">
      <div>
        <label>Equipamento</label>
        <input {...register("equipamento")} className="w-full border p-2 rounded text-gray-800" />
        {errors.equipamento && <p className="text-red-500">{errors.equipamento.message}</p>}
      </div>

      <div>
        <label>Quantidade</label>
        <input type="number" {...register("quantidade")} className="w-full border p-2 rounded text-gray-800" />
        {errors.quantidade && <p className="text-red-500">{errors.quantidade.message}</p>}
      </div>

      <div>
        <label>Data</label>
        <input type="date" {...register("data")} className="w-full border p-2 rounded text-gray-800" />
        {errors.data && <p className="text-red-500">{errors.data.message}</p>}
      </div>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">
        Atualizar
      </button>

      {message && <p className="text-center text-sm mt-2 text-blue-600">{message}</p>}
    </form>
  );
};

export default FormEditItem;
