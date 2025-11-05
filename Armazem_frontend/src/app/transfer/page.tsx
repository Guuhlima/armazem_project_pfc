'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TransferForm from "./create/TransferForm";
import CreateEstoqueForm from "./create-estoque/CreateEstoqueForm";
import ListEstoqueForm from "./list-estoque/ListarEstoque";
import Sidebar from "../components/Sidebar";
import RecebimentoForm from "./create-recebimento/RecebimentoForm";
import SaidaForm from "./create-saida/SaidaForm";
import ContagensPage from "./contagem-ciclica/contagem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Boxes,
  PlusCircle,
  Repeat,
  ArrowLeft,
  ChevronRight,
  PackageMinus,
  LayoutGrid,
} from "lucide-react";
import withAuth from "app/components/withAuth";
import { AnimatePresence, motion } from "framer-motion";
import { Separator } from '@/components/ui/separator'; 
import { useIsClient } from '@/hooks/useIsClient'; 

type View =
  | "inicio"
  | "criarEstoque"
  | "listarEstoques"
  | "novaTransferencia"
  | "novoRecebimento"
  | "novaSaida"
  | "contagemCiclica";

const enter = { opacity: 0, y: 8 };
const center = { opacity: 1, y: 0, transition: { duration: 0.2 } };
const exit = { opacity: 0, y: 8, transition: { duration: 0.15 } };

function ActionCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group w-full text-left rounded-xl shadow-xl transition
                 bg-card/90 dark:bg-zinc-900/85 backdrop-blur-lg 
                 border border-border dark:border-blue-800/50 
                 hover:border-blue-500/50 dark:hover:border-blue-600/70" 
      aria-label={title}
    >
      <CardContent className="p-5 md:p-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {subtitle}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary"> 
            <span>Abrir</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
        <div className="shrink-0 rounded-lg p-3 bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-800/20 dark:to-transparent text-primary ring-1 ring-border/60">
          {icon}
        </div>
      </CardContent>
    </motion.button>
  );
}

function Segmented({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  const btn = (v: View, label: string) => (
    <button
      onClick={() => setView(v)}
      className={[
        "px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors",
        view === v
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
      aria-pressed={view === v}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border dark:border-zinc-700/50 bg-card/90 dark:bg-zinc-900/70 backdrop-blur-sm p-1">
      {btn("inicio", "Início")}
      {btn("criarEstoque", "Criar")}
      {btn("listarEstoques", "Listar")}
      {btn("novaTransferencia", "Transferir")}
      {btn("novoRecebimento", "Receber")}
      {btn("novaSaida", "Saída")}
      {btn("contagemCiclica", "Contagem")}
    </div>
  );
}

const TransferDashboardPage = () => {
  const [view, setView] = useState<View>("inicio");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout } = useAuth(); 
  const isClient = useIsClient();

  if (!isClient) return null; 

  const handleLogout = async () => {
    await logout();
  };

  const viewTitles: Record<View, string> = {
      inicio: "Painel de Transferências",
      criarEstoque: "Criar Novo Estoque",
      listarEstoques: "Estoques Cadastrados",
      novaTransferencia: "Nova Transferência",
      novoRecebimento: "Novo Recebimento",
      novaSaida: "Nova Saída de Itens",
      contagemCiclica: "Contagem Cíclica de Inventário"
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">
      
      <div
        className="fixed inset-0 z-0 animate-neon-grid"
        style={{
          backgroundColor: 'transparent',
          backgroundImage: `
            linear-gradient(rgba(200, 200, 200, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200, 200, 200, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      >
        <div 
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: `
              linear-gradient(rgba(29, 78, 216, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(29, 78, 216, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            boxShadow: 'inset 0 0 100px 50px rgba(29, 78, 216, 0.15)',
          }}
        />
      </div>

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout} 
      />

      <main
        className={`relative z-10 transition-all duration-300 p-4 md:p-6 bg-transparent ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        }`}
        role="main"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <nav className="flex items-center text-sm text-muted-foreground mb-1">
                {view !== "inicio" ? (
                  <>
                    <button
                      onClick={() => setView("inicio")}
                      className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Painel
                    </button>
                    <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                    <span className="font-medium text-primary">{viewTitles[view]}</span>
                  </>
                ) : (
                   <span className="font-medium text-primary flex items-center gap-2">
                       <LayoutGrid className="w-4 h-4" /> Painel de Transferências
                   </span>
                )}
              </nav>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {viewTitles[view]}
              </h1>
              {view === "inicio" && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione uma ação para gerenciar seus estoques e movimentações.
                </p>
              )}
            </div>
            <div className="w-full md:w-auto">
                <Segmented view={view} setView={setView} />
            </div>
          </div>

          <Separator className="bg-border/50" />

          <AnimatePresence mode="wait">
            {view === "inicio" && (
              <motion.section
                key="inicio"
                initial={enter} animate={center} exit={exit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                <ActionCard title="Criar estoque" subtitle="Novo" icon={<PlusCircle className="w-6 h-6" />} onClick={() => setView("criarEstoque")} />
                <ActionCard title="Estoques existentes" subtitle="Consultar" icon={<Boxes className="w-6 h-6" />} onClick={() => setView("listarEstoques")} />
                <ActionCard title="Nova transferência" subtitle="Operação" icon={<Repeat className="w-6 h-6" />} onClick={() => setView("novaTransferencia")} />
                <ActionCard title="Novo recebimento" subtitle="Entrada" icon={<PlusCircle className="w-6 h-6" />} onClick={() => setView("novoRecebimento")} />
                <ActionCard title="Nova saída" subtitle="Operação" icon={<PackageMinus className="w-6 h-6" />} onClick={() => setView("novaSaida")} />
                <ActionCard title="Contagem cíclica" subtitle="Inventário rotativo" icon={<Boxes className="w-6 h-6" />} onClick={() => setView("contagemCiclica")} />
              </motion.section>
            )}

            {view !== "inicio" && (
              <motion.section
                key={view}
                initial={enter} animate={center} exit={exit}
              >
                <Card className="w-full bg-card/90 dark:bg-card/85 backdrop-blur-lg border border-border dark:border-blue-800/50 shadow-xl rounded-xl overflow-hidden">
                  <CardHeader className="p-6 border-b border-border dark:border-blue-800/40">
                    <CardTitle className="text-xl font-semibold text-foreground">
                      {viewTitles[view]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                    {view === "criarEstoque" && <CreateEstoqueForm />}
                    {view === "listarEstoques" && <ListEstoqueForm />}
                    {view === "novaTransferencia" && <TransferForm />}
                    {view === "novoRecebimento" && <RecebimentoForm />}
                    {view === "novaSaida" && <SaidaForm />}
                    {view === "contagemCiclica" && <ContagensPage />}
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>

          {view !== "inicio" && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                className="text-primary hover:text-primary/90"
                onClick={() => setView("inicio")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao menu principal
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default withAuth(TransferDashboardPage);