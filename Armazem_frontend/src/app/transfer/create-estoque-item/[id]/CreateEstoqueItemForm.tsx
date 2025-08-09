"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Sidebar from "@/app/components/Sidebar";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";

const schema = z.object({
  itemId: z.number({ required_error: "Selecione o item" }),
  quantidade: z.number().min(1, "Quantidade deve ser maior que zero"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  estoqueId: number;
}

export default function CreateEstoqueItemForm({ estoqueId }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [equipamentos, setEquipamentos] = useState<{ id: number; nome: string }[]>([]);
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState<number | null>(null);

  const selectedItemId = watch("itemId");
  const selectedQuantidade = watch("quantidade") || 0;

  useEffect(() => {
    async function fetchEquipamentos() {
      try {
        const res = await api.get("/equipment/visualizar");
        setEquipamentos(res.data);
      } catch (error) {
        console.error("Erro ao buscar equipamentos", error);
      }
    }

    fetchEquipamentos();
  }, []);

  useEffect(() => {
    async function fetchQuantidadeDisponivel() {
      if (!selectedItemId) {
        setQuantidadeDisponivel(null);
        return;
      }

      try {
        const res = await api.get(`/equipment/visualizar/${selectedItemId}`);
        setQuantidadeDisponivel(res.data.quantidade || 0);
      } catch (error) {
        console.error("Erro ao buscar quantidade do item", error);
        setQuantidadeDisponivel(null);
      }
    }

    fetchQuantidadeDisponivel();
  }, [selectedItemId]);

  const onSubmit = async (data: FormData) => {
    try {
      await api.post(`/stockmovi/cadastro/${estoqueId}/adicionar-equipamento`, data);
      reset();
      Swal.fire({
        icon: "success",
        title: "Sucesso!",
        text: "Item adicionado com sucesso!",
        timer: 2000,
        confirmButtonColor: "#2563eb",
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Erro ao adicionar item!",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={() => {
          localStorage.removeItem("auth");
          window.location.href = "/";
        }}
      />

      <main
        className={`min-h-screen transition-all duration-300 p-8 ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        } bg-background text-foreground`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto"
        >
          <h1 className="text-3xl font-bold mb-6 text-center text-blue-600 dark:text-blue-400">
            Adicionar Equipamento ao Estoque #{estoqueId}
          </h1>

          <Card className="shadow-lg rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-card">
            <CardContent className="p-6 space-y-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="itemId">Equipamento</Label>
                  <select
                    id="itemId"
                    {...register("itemId", { valueAsNumber: true })}
                    className="w-full border border-input rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  >
                    <option value="">Selecione um equipamento</option>
                    {equipamentos.map((equipamento) => (
                      <option key={equipamento.id} value={equipamento.id}>
                        {equipamento.nome}
                      </option>
                    ))}
                  </select>
                  {errors.itemId && (
                    <p className="text-red-500 text-sm mt-1">{errors.itemId.message}</p>
                  )}
                </div>

                {quantidadeDisponivel !== null && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Quantidade disponível: <strong>{quantidadeDisponivel}</strong>
                  </div>
                )}

                <div>
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    type="number"
                    placeholder="Digite a quantidade"
                    {...register("quantidade", { valueAsNumber: true })}
                  />
                  {errors.quantidade && (
                    <p className="text-red-500 text-sm mt-1">{errors.quantidade.message}</p>
                  )}
                </div>

                {quantidadeDisponivel !== null && (
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    Quantidade após entrada:{" "}
                    <strong>{quantidadeDisponivel + selectedQuantidade}</strong>
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Adicionando..." : "Adicionar ao Estoque"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
