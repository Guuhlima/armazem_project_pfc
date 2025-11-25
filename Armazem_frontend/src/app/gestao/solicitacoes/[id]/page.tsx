'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { approveRequest, getRequest, rejectRequest, type AccessRequest } from '@/services/requests';
import { useAuth } from '@/contexts/AuthContext';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Footer from '@/app/components/Footer';

export default function AccessRequestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const MySwal = withReactContent(Swal);

  const [reqData, setReqData] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await getRequest(Number(id));
      setReqData(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao carregar solicitação');
      setReqData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const canDecide =
    !!reqData &&
    reqData.status === 'PENDING' &&
    hasPermission(['SUPER-ADMIN', 'stock:admin', 'user:manage']);

  const doApprove = async () => {
    try {
      setActing('approve');
      await approveRequest(Number(id));
      await load(); // Recarrega os dados para mostrar o status "APPROVED"

      await MySwal.fire({
        title: 'Sucesso!',
        text: 'Solicitação aprovada e usuário vinculado.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: '#0b0b0b',
        color: '#e5e7eb'
      });

    } catch (e: any) {
      await MySwal.fire({
        title: 'Erro!',
        text: e?.response?.data?.error || 'Erro ao aprovar solicitação',
        icon: 'error',
        background: '#0b0b0b',
        color: '#e5e7eb'
      });
    } finally {
      setActing(null);
    }
  };

  const doReject = async () => {
    try {
      setActing('reject');
      await rejectRequest(Number(id));
      await load(); // Recarrega os dados para mostrar o status "REJECTED"

      await MySwal.fire({
        title: 'Solicitação Rejeitada',
        text: 'A solicitação foi rejeitada com sucesso.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: '#0b0b0b',
        color: '#e5e7eb'
      });

    } catch (e: any) {
      await MySwal.fire({
        title: 'Erro!',
        text: e?.response?.data?.error || 'Erro ao rejeitar solicitação',
        icon: 'error',
        background: '#0b0b0b',
        color: '#e5e7eb'
      });
    } finally {
      setActing(null);
    }
  };

  return (
    // Container principal
    <div className="min-h-screen relative overflow-hidden bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">

      <div
        className="fixed inset-0 z-0 animate-starfield opacity-40 dark:opacity-70 bg-zinc-100 dark:bg-black"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.7) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />


      <main className="relative z-10 transition-all duration-300 px-4 sm:px-8 py-12 flex justify-center bg-transparent ml-0 sm:ml-16 md:ml-60">

        <div className="w-full max-w-3xl">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-primary dark:hover:text-primary-light hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="bg-card/90 dark:bg-card/85 backdrop-blur-lg border border-border dark:border-blue-800/50 shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-border dark:border-blue-800/40">
              <h1 className="text-xl font-semibold text-foreground">Solicitação de Acesso</h1>
            </CardHeader>

            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando detalhes da solicitação...
                </div>
              ) : error ? (
                <div className="text-destructive text-sm">{error}</div>
              ) : !reqData ? (
                <div className="text-sm text-muted-foreground">Solicitação não encontrada.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                    <Info label="ID">{reqData.id}</Info>
                    <Info label="Status">
                      <StatusBadge status={reqData.status} />
                    </Info>
                    <Info label="Armazém Solicitado">{reqData.estoque?.nome ?? reqData.estoqueId}</Info>
                    <Info label="Solicitante">
                      {reqData.usuario?.nome ?? reqData.usuario?.email ?? reqData.usuarioId}
                    </Info>
                    <Info label="Criada em">
                      {new Date(reqData.createdAt).toLocaleString('pt-BR')}
                    </Info>
                    {reqData.decidedAt && (
                      <Info label="Decidida em">{new Date(reqData.decidedAt).toLocaleString('pt-BR')}</Info>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Motivo da Solicitação</div>
                    <p className="text-base text-foreground whitespace-pre-wrap p-4 bg-muted/50 rounded-md border border-border dark:border-zinc-700/50">
                      {reqData.reason || '(Nenhum motivo fornecido)'}
                    </p>
                  </div>

                  {canDecide ? (
                    <div className="flex items-center gap-3 pt-4 border-t border-border dark:border-zinc-700/50">
                      <Button
                        onClick={doApprove}
                        disabled={acting !== null}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {acting === 'approve' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Aprovando…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={doReject}
                        disabled={acting !== null}
                        variant="destructive"
                      >
                        {acting === 'reject' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Rejeitando…
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground pt-4 border-t border-border dark:border-zinc-700/50">
                      {reqData.status !== 'PENDING'
                        ? 'Esta solicitação já foi decidida.'
                        : 'Você não tem permissão para decidir esta solicitação.'}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </div>
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: AccessRequest['status'] }) {
  const map: Record<AccessRequest['status'], string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700/50',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-700/50',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-700/50',
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${map[status]}`}>
      {status}
    </span>
  );
}