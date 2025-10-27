'use client';

import { useState } from 'react';
import TransferForm from './create/TransferForm';
import CreateEstoqueForm from './create-estoque/CreateEstoqueForm';
import ListEstoqueForm from './list-estoque/ListarEstoque';
import Sidebar from '../components/Sidebar';
import RecebimentoForm from './create-recebimento/RecebimentoForm';
import SaidaForm from './create-saida/SaidaForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Boxes, PlusCircle, Repeat, ArrowLeft, ChevronRight, PackageMinus } from 'lucide-react';
import withAuth from 'app/components/withAuth';
import { AnimatePresence, motion } from 'framer-motion';

type View = 'inicio' | 'criarEstoque' | 'listarEstoques' | 'novaTransferencia' | 'novoRecebimento' | 'novaSaida';

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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.985 }}
      className="group w-full text-left rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
      aria-label={title}
    >
      <Card className="border-0 bg-transparent">
        <CardContent className="p-5 md:p-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{subtitle}</p>
            <h3 className="mt-1 text-lg font-semibold">{title}</h3>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span>Abrir</span>
              <ChevronRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" />
            </div>
          </div>
          <div className="shrink-0 rounded-xl p-3 bg-accent text-accent-foreground ring-1 ring-border/60">
            {icon}
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}

function Segmented({ view, setView }: { view: View; setView: (v: View) => void }) {
  const btn = (v: View, label: string) => (
    <button
      onClick={() => setView(v)}
      className={[
        'px-3 py-1.5 text-sm rounded-md transition',
        view === v
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      ].join(' ')}
      aria-pressed={view === v}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1">
      {btn('inicio', 'Início')}
      {btn('criarEstoque', 'Criar estoque')}
      {btn('listarEstoques', 'Estoques')}
      {btn('novaTransferencia', 'Transferir')}
      {btn('novoRecebimento', 'Receber')}
      {btn('novaSaida', 'Sair (Fefo/Serial)')}
    </div>
  );
}

const TransferDashboardPage = () => {
  const [view, setView] = useState<View>('inicio');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('auth');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      <main
        className={`transition-all duration-300 p-4 md:p-6 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}
        role="main"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {view !== 'inicio' && (
                  <>
                    <button
                      onClick={() => setView('inicio')}
                      className="inline-flex items-center gap-1 hover:text-foreground transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <span>/</span>
                  </>
                )}
                <span>Painel</span>
              </div>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold">Transferências</h1>
              <p className="text-sm text-muted-foreground">
                Crie estoques, visualize existentes e realize ou agende transferências.
              </p>
            </div>
            <Segmented view={view} setView={setView} />
          </div>

          <AnimatePresence mode="wait">
            {view === 'inicio' && (
              <motion.section
                key="inicio"
                initial={enter}
                animate={center}
                exit={exit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                <ActionCard
                  title="Criar estoque"
                  subtitle="Novo"
                  icon={<PlusCircle className="w-6 h-6" />}
                  onClick={() => setView('criarEstoque')}
                />
                <ActionCard
                  title="Estoques existentes"
                  subtitle="Consultar"
                  icon={<Boxes className="w-6 h-6" />}
                  onClick={() => setView('listarEstoques')}
                />
                <ActionCard
                  title="Nova transferência"
                  subtitle="Operação"
                  icon={<Repeat className="w-6 h-6" />}
                  onClick={() => setView('novaTransferencia')}
                />
                <ActionCard
                  title="Novo recebimento"
                  subtitle="Entrada"
                  icon={<PlusCircle className="w-6 h-6" />}
                  onClick={() => setView('novoRecebimento')}
                />
                <ActionCard
                  title="Nova saída"
                  subtitle="Operação"
                  icon={<PackageMinus className="w-6 h-6" />}
                  onClick={() => setView('novaSaida')}
                />
              </motion.section>
            )}

            {view === 'criarEstoque' && (
              <motion.section key="criar" initial={enter} animate={center} exit={exit}>
                <div className="rounded-2xl border border-border bg-card shadow-sm p-4 md:p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">Criar novo estoque</h2>
                    <p className="text-sm text-muted-foreground">
                      Defina nome e configurações iniciais do estoque.
                    </p>
                  </div>
                  <CreateEstoqueForm />
                </div>
              </motion.section>
            )}

            {view === 'listarEstoques' && (
              <motion.section key="listar" initial={enter} animate={center} exit={exit}>
                <div className="rounded-2xl border border-border bg-card shadow-sm p-4 md:p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">Estoques</h2>
                    <p className="text-sm text-muted-foreground">
                      Consulte os estoques cadastrados e seus itens.
                    </p>
                  </div>
                  <ListEstoqueForm />
                </div>
              </motion.section>
            )}

            {view === 'novaTransferencia' && (
              <motion.section key="transferir" initial={enter} animate={center} exit={exit}>
                <div className="rounded-2xl border border-border bg-card shadow-sm p-4 md:p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">Nova transferência</h2>
                    <p className="text-sm text-muted-foreground">
                      Selecione origem, item, destino e quantidade. Você pode agendar a execução.
                    </p>
                  </div>
                  <TransferForm />
                </div>
              </motion.section>
            )}

            {view === 'novoRecebimento' && (
              <motion.section key="receber" initial={enter} animate={center} exit={exit}>
                <div className="rounded-2xl border border-border bg-card shadow-sm p-4 md:p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">Novo recebimento</h2>
                    <p className="text-sm text-muted-foreground">
                      Lance entradas no estoque por item, lote/validade e serial (quando aplicável).
                    </p>
                  </div>
                  <RecebimentoForm />
                </div>
              </motion.section>
            )}

            {view === 'novaSaida' && (
              <motion.section key="saida" initial={enter} animate={center} exit={exit}>
                <div className="rounded-2xl border border-border bg-card shadow-sm p-4 md:p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">Nova saída</h2>
                    <p className="text-sm text-muted-foreground">
                      Retire itens por FEFO (lote) ou por serial quando aplicável.
                    </p>
                  </div>
                  <SaidaForm />
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {view !== 'inicio' && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" className="text-primary" onClick={() => setView('inicio')}>
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
