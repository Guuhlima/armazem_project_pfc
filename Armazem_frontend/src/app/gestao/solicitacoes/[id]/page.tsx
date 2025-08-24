// app/gestao/solicitacoes/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { approveRequest, getRequest, rejectRequest, type AccessRequest } from '@/services/requests';
import { useAuth } from '@/contexts/AuthContext';

export default function AccessRequestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();

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
    hasPermission(['SUPER-ADMIN', 'stock:admin', 'user:manage']); // ajuste às suas regras

  const doApprove = async () => {
    try {
      setActing('approve');
      await approveRequest(Number(id));
      await load();
      alert('Solicitação aprovada e usuário vinculado.');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Erro ao aprovar solicitação');
    } finally {
      setActing(null);
    }
  };

  const doReject = async () => {
    try {
      setActing('reject');
      await rejectRequest(Number(id));
      await load();
      alert('Solicitação rejeitada.');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Erro ao rejeitar solicitação');
    } finally {
      setActing(null);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow">
          <h1 className="text-xl font-semibold mb-4">Solicitação de acesso</h1>

          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando…
            </div>
          ) : error ? (
            <div className="text-red-500 text-sm">{error}</div>
          ) : !reqData ? (
            <div className="text-sm text-zinc-500">Solicitação não encontrada.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Info label="ID">{reqData.id}</Info>
                <Info label="Status">
                  <StatusBadge status={reqData.status} />
                </Info>
                <Info label="Armazém">{reqData.estoque?.nome ?? reqData.estoqueId}</Info>
                <Info label="Solicitante">
                  {reqData.usuario?.nome ?? reqData.usuario?.email ?? reqData.usuarioId}
                </Info>
                <Info label="Criada em">
                  {new Date(reqData.createdAt).toLocaleString()}
                </Info>
                {reqData.decidedAt && (
                  <Info label="Decidida em">{new Date(reqData.decidedAt).toLocaleString()}</Info>
                )}
              </div>

              <div className="mb-6">
                <div className="text-sm font-medium mb-1">Motivo</div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                  {reqData.reason || '—'}
                </p>
              </div>

              {canDecide ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={doApprove}
                    disabled={acting !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                  >
                    {acting === 'approve' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Aprovando…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Aprovar
                      </>
                    )}
                  </button>
                  <button
                    onClick={doReject}
                    disabled={acting !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
                  >
                    {acting === 'reject' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Rejeitando…
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" /> Rejeitar
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-sm text-zinc-500">
                  {reqData.status !== 'PENDING'
                    ? 'Esta solicitação já foi decidida.'
                    : 'Você não tem permissão para decidir esta solicitação.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: AccessRequest['status'] }) {
  const map: Record<AccessRequest['status'], string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${map[status]}`}>
      {status}
    </span>
  );
}
