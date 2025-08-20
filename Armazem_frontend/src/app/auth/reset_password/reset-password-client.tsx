'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock } from 'lucide-react';
import api from '@/services/api';
import Swal from 'sweetalert2';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>(
    token ? 'checking' : 'idle'
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setTokenStatus('checking');
        await api.post('/auth/reset/validate', { token }); // 200 => válido
        setTokenStatus('valid');
      } catch {
        setTokenStatus('invalid');
      }
    })();
  }, [token]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      Swal.fire({ title: 'Atenção', text: 'Informe seu e-mail.', icon: 'warning', timer: 1800 });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset/request', { email });
      Swal.fire({
        title: 'Verifique seu e-mail',
        text: 'Se o e-mail existir, enviaremos as instruções para resetar a senha.',
        icon: 'success',
        timer: 2500,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 || status === 404) {
        Swal.fire({ title: 'Email não encontrado', icon: 'error', timer: 2000 });
      } else {
        Swal.fire({ title: 'Erro', text: 'Não foi possível solicitar o reset.', icon: 'error', timer: 2000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) {
      Swal.fire({ title: 'Atenção', text: 'As senhas não coincidem.', icon: 'warning', timer: 1800 });
      return;
    }
    if (senha.length < 8) {
      Swal.fire({ title: 'Atenção', text: 'A senha deve ter pelo menos 8 caracteres.', icon: 'warning', timer: 2000 });
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await api.post('/auth/reset/confirm', { token, novaSenha: senha });
      await Swal.fire({ title: 'Sucesso', text: 'Senha alterada com sucesso.', icon: 'success', timer: 2000 });
      router.push('/'); // login
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (status === 400) {
        Swal.fire({ title: 'Token inválido ou expirado', icon: 'error', timer: 2200 });
        setTokenStatus('invalid');
      } else {
        Swal.fire({ title: 'Erro', text: msg ?? 'Erro ao alterar senha.', icon: 'error', timer: 2200 });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="rounded-2xl shadow-2xl">
          <CardContent className="p-8 space-y-6">
            {token ? (
              <>
                <h2 className="text-3xl font-bold text-center text-zinc-800 dark:text-white">Redefinir senha</h2>
                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {tokenStatus === 'checking'
                    ? 'Validando token...'
                    : tokenStatus === 'valid'
                    ? 'Informe sua nova senha abaixo'
                    : 'Token inválido ou expirado'}
                </p>

                {tokenStatus === 'checking' && (
                  <Button className="w-full" disabled>
                    Validando...
                  </Button>
                )}

                {tokenStatus === 'invalid' && (
                  <div className="space-y-3">
                    <Button className="w-full" onClick={() => router.push('/auth/reset_password')}>
                      Solicitar novo envio
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={() => router.push('/')}>
                      Voltar ao login
                    </Button>
                  </div>
                )}

                {tokenStatus === 'valid' && (
                  <form onSubmit={handleConfirm} className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        <Lock className="w-4 h-4" />
                        Nova senha
                      </label>
                      <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        <Lock className="w-4 h-4" />
                        Confirmar nova senha
                      </label>
                      <Input
                        type="password"
                        value={confirmar}
                        onChange={(e) => setConfirmar(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? 'Salvando...' : 'Redefinir senha'}
                    </Button>

                    <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')}>
                      Voltar ao login
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-center text-zinc-800 dark:text-white">Recuperar senha</h2>
                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Informe seu e-mail para enviarmos as instruções
                </p>

                <form onSubmit={handleRequest} className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      <Mail className="w-4 h-4" />
                      E-mail
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="voce@exemplo.com"
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar instruções'}
                  </Button>

                  <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')}>
                    Voltar ao login
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
