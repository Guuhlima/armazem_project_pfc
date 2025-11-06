// src/app/equipamento/get/page.tsx (Layout 100% CORRIGIDO)
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSchema, GetFormData } from "./schema"; 
import { useRouter } from "next/navigation"; 
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
import { ChevronRight, Search, Package } from 'lucide-react';
import { useIsClient } from '@/hooks/useIsClient';

interface FoundItem {
  id: number;
  nome?: string;
  equipamento?: string; 
  quantidade?: number;
  data?: string | Date | null | undefined; 
  minimo?: number;
}

// Função formatarData (sem alterações)
function formatarData(dataInput: string | Date | null | undefined): string {
    if (!dataInput) return 'N/A';
    let data: Date;
    try {
        if (typeof dataInput === 'string') { data = new Date(dataInput); }
        else if (dataInput instanceof Date) { data = dataInput; }
        else { return 'N/A'; }
        if (isNaN(data.getTime())) { return typeof dataInput === 'string' ? dataInput : 'Data Inválida'; }
        const dataUtc = new Date(data.valueOf() + data.getTimezoneOffset() * 60000);
        return new Intl.DateTimeFormat('pt-BR').format(dataUtc);
    } catch (e) { return String(dataInput); }
}

const GetItemById = () => {
  // --- HOOKS (sem alterações) ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [item, setItem] = useState<FoundItem | null>(null);
  const [loading, setLoading] = useState(false);
  const MySwal = withReactContent(Swal);
  const { logout } = useAuth();
  const router = useRouter();
  const isClient = useIsClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GetFormData>({
    resolver: zodResolver(getSchema),
  });

  if (!isClient) return null;

  // --- Lógica onSubmit (sem alterações) ---
  const onSubmit = async (data: GetFormData) => {
    setLoading(true);
    setItem(null); 
    try {
      const response = await api.get(`/equipment/visualizar/${data.id}`);
      if (!response.data) { throw new Error("Equipamento não encontrado."); }
      setItem(response.data);
      MySwal.fire({
        icon: 'success', title: 'Encontrado!',
        text: `Equipamento ID: ${data.id} carregado.`,
        timer: 2000, showConfirmButton: false,
        background: '#0b0b0b', color: '#e5e7eb'
      });
    } catch (err: any) {
      console.error('Erro ao buscar equipamento:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Equipamento não encontrado ou erro na busca.';
      MySwal.fire({
        icon: 'error', title: 'Falha na Busca',
        text: `Erro: ${errorMsg}`,
        background: '#0b0b0b', color: '#e5e7eb'
      });
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    // ✅ Container principal: Mantém o fundo base do tema
    <div className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">

      <div
        className="fixed inset-0 z-0 animate-starfield opacity-40 dark:opacity-70 bg-zinc-100 dark:bg-black"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.7) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Sidebar (z-50, 'fixed', fica acima de tudo) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* ✅ Main (z-10, bg-transparent, usa 'ml' para espaço) */}
      <main
        className={`relative z-10 transition-all duration-300 px-4 sm:px-8 py-12 flex justify-center bg-transparent ${ // bg-transparent é crucial
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        {/* Card principal (usa cores de tema) */}
        <Card className="w-full max-w-lg bg-card/90 dark:bg-card/85 backdrop-blur-lg border border-border dark:border-blue-800/50 shadow-xl rounded-xl overflow-hidden">
          
          <CardHeader className="flex flex-row items-center justify-between p-6 bg-gradient-to-r from-muted/50 to-transparent dark:from-blue-950/40 dark:to-transparent border-b border-border dark:border-blue-800/40">
            <div className="space-y-1">
              <nav className="flex items-center text-xs sm:text-sm text-muted-foreground">
                <a href="/home" className="hover:text-primary transition-colors">Dashboard</a>
                <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                <span className="font-medium text-primary">Consultar Equipamento</span>
              </nav>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Search className="w-6 h-6 sm:w-7 sm:h-7 text-primary" /> Consultar Item por ID
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Formulário (usa cores de tema) */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="id" className="text-sm font-medium text-foreground/80">ID do Equipamento</Label>
                <Input
                  id="id"
                  type="text"
                  {...register("id")}
                  placeholder="Digite o ID numérico do item"
                  className="mt-1 text-base bg-background/80 dark:bg-zinc-800/70 border-input focus:border-primary ring-offset-background placeholder:text-muted-foreground"
                />
                {errors.id && (
                  <p className="text-destructive text-xs mt-1">{errors.id.message}</p>
                )}
              </div>

              {/* Botão Submit (usa cores de tema) */}
              <Button
                type="submit"
                className="w-full text-base sm:text-lg py-2.5 sm:py-3 mt-4 bg-primary hover:bg-primary/90 text-primary-foreground
                           font-semibold transition-all duration-300 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.01]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                disabled={loading}
              >
                {loading ? 'Buscando...' : 'Consultar'}
              </Button>
            </form>

            {/* --- Área de Resultado (usa cores de tema) --- */}
            {item && (
              <div className="mt-6 space-y-4 pt-6 border-t border-border dark:border-blue-700/30">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary"/>
                  Resultado da Busca
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border dark:border-zinc-800 pb-1.5 pt-1">
                    <dt className="text-muted-foreground">ID:</dt>
                    <dd className="font-mono text-foreground">{item.id}</dd>
                  </div>
                  <div className="flex justify-between border-b border-border dark:border-zinc-800 pb-1.5 pt-1">
                    <dt className="text-muted-foreground">Nome:</dt>
                    <dd className="font-medium text-foreground">{item.nome || item.equipamento || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-border dark:border-zinc-800 pb-1.5 pt-1">
                    <dt className="text-muted-foreground">Quantidade:</dt>
                    <dd className="font-medium text-foreground">{item.quantidade ?? 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-border dark:border-zinc-800 pb-1.5 pt-1">
                    <dt className="text-muted-foreground">Mínimo:</dt>
                    <dd className="font-medium text-foreground">{item.minimo ?? 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-border dark:border-zinc-800 pb-1.5 pt-1">
                    <dt className="text-muted-foreground">Data Registro:</dt>
                    <dd className="text-foreground">{formatarData(item.data)}</dd>
                  </div>
                </dl>
              </div>
            )}
            {/* --- Fim da Área de Resultado --- */}

          </CardContent>
        </Card>
      </main>

      {/* REMOVIDO: O <div className="relative z-10"> que envolvia a Sidebar e o Main.
        Eles agora são "irmãos" do fundo animado.
      */}

    </div>
  );
};

import withAuth from '../../components/withAuth';
export default withAuth(GetItemById);