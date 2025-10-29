'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock, Package } from 'lucide-react';
import { apiAuth } from '@/services/api';
import Swal from 'sweetalert2';
import { useIsClient } from '@/hooks/useIsClient';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const isClient = useIsClient();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>(
    token ? 'checking' : 'idle'
  );

  useEffect(() => {
    if (!isClient || !token) {
        if (isClient && token) setTokenStatus('checking'); 
        else if (isClient && !token) setTokenStatus('idle');
        return;
    };

    (async () => {
      try {
        await apiAuth.post('/auth/reset/validate', { token });
        setTokenStatus('valid');
      } catch {
        setTokenStatus('invalid');
        Swal.fire({
            title: 'Erro',
            text: 'O link para redefinir a senha é inválido ou expirou.',
            icon: 'error',
            background: '#0b0b0b',
            color: '#e5e7eb'
        });
      }
    })();
  }, [token, isClient]); 

  if (!isClient) return null;

  const handleRequest = async (e: React.FormEvent) => {
     e.preventDefault();
    if (!email) {
      Swal.fire({ title: 'Atenção', text: 'Informe seu e-mail.', icon: 'warning', background: '#0b0b0b', color: '#e5e7eb' });
      return;
    }
    setLoading(true);
    try {
      await apiAuth.post('/auth/reset/request', { email });
      Swal.fire({
        title: 'Verifique seu e-mail',
        text: 'Se o e-mail existir em nossa base, enviaremos as instruções para resetar a senha.',
        icon: 'success',
        timer: 3000,
        background: '#0b0b0b',
        color: '#e5e7eb'
      });
      setEmail('');
    } catch (err: any) {
      console.error("Erro ao solicitar reset:", err);
      Swal.fire({
        title: 'Verifique seu e-mail',
        text: 'Se o e-mail existir em nossa base, enviaremos as instruções para resetar a senha.',
        icon: 'success',
        timer: 3000,
        background: '#0b0b0b',
        color: '#e5e7eb'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) {
      Swal.fire({ title: 'Atenção', text: 'As senhas não coincidem.', icon: 'warning', background: '#0b0b0b', color: '#e5e7eb' });
      return;
    }
    if (senha.length < 6) {
      Swal.fire({ title: 'Atenção', text: 'A senha deve ter pelo menos 6 caracteres.', icon: 'warning', background: '#0b0b0b', color: '#e5e7eb' });
      return;
    }
    if (!token || tokenStatus !== 'valid') {
        Swal.fire({ title: 'Erro', text: 'Token inválido ou ausente.', icon: 'error', background: '#0b0b0b', color: '#e5e7eb' });
        return;
    };

    setLoading(true);
    try {
      await apiAuth.post('/auth/reset/confirm', { token, novaSenha: senha });
      await Swal.fire({
          title: 'Sucesso',
          text: 'Senha alterada com sucesso! Redirecionando para o login...',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#0b0b0b',
          color: '#e5e7eb'
        });
      router.push('/');

    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || 'Erro ao alterar senha.';
      Swal.fire({
          title: 'Erro',
          text: (status === 400 || msg.includes('Token')) ? 'Token inválido ou expirado. Solicite novamente.' : msg,
          icon: 'error',
          background: '#0b0b0b',
          color: '#e5e7eb'
        });
      if (status === 400) {
        setTokenStatus('invalid');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-between p-16 relative overflow-hidden bg-zinc-900">
       <div
        className="absolute inset-0 z-0 animate-pan-grid"
        style={{
          backgroundColor: '#18181b',
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

       <motion.div
        className="flex flex-col z-10"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      >
        <div className="flex items-center gap-4">
          <Package className="w-12 h-12 text-blue-500" />
          <h1 className="text-5xl font-bold text-white">
            Armazem Integrado <span className="text-blue-500">G3</span>
          </h1>
        </div>
        <p className="text-xl text-zinc-400 mt-2 ml-[64px]">
          Plataforma de Gestão de Estoque
        </p>
      </motion.div>

       <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="rounded-2xl border border-zinc-700/50 bg-zinc-900/60 backdrop-blur-lg">
          <CardContent className="p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.7 }}
              className="space-y-6"
            >
              {token ? (
                  <>
                  <h2 className="text-3xl font-bold text-center text-white">Redefinir senha</h2>
                  <p className="text-center text-sm text-zinc-400">
                    {tokenStatus === 'checking'
                      ? 'Validando link...'
                      : tokenStatus === 'valid'
                      ? 'Informe sua nova senha abaixo'
                      : 'Link inválido ou expirado'}
                  </p>
                  {tokenStatus === 'checking' && (
                     <div className="text-center text-zinc-400">Validando...</div>
                  )}
                  {tokenStatus === 'invalid' && (
                    <div className="space-y-3 pt-4">
                      <Button className="w-full" onClick={() => router.push('/auth/reset_password')}>
                        Solicitar novo link
                      </Button>
                      <Button variant="ghost" className="w-full text-zinc-300 hover:text-white" onClick={() => router.push('/')}>
                        Voltar ao login
                      </Button>
                    </div>
                  )}
                  {tokenStatus === 'valid' && (
                    <form onSubmit={handleConfirm} className="space-y-4 pt-2">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                          <Lock className="w-4 h-4" />
                          Nova senha
                        </label>
                        <Input
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            required
                            minLength={6}
                            className="bg-transparent border-zinc-600 text-white placeholder:text-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                          <Lock className="w-4 h-4" />
                          Confirmar nova senha
                        </label>
                        <Input
                          type="password"
                          value={confirmar}
                          onChange={(e) => setConfirmar(e.target.value)}
                          required
                          className="bg-transparent border-zinc-600 text-white placeholder:text-zinc-500"
                        />
                      </div>
                      <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? 'Salvando...' : 'Redefinir senha'}
                      </Button>
                      <Button type="button" variant="ghost" className="w-full text-zinc-300 hover:text-white" onClick={() => router.push('/')}>
                        Voltar ao login
                      </Button>
                    </form>
                  )}
                </>
              ) : (
                 <>
                  <h2 className="text-3xl font-bold text-center text-white">Recuperar senha</h2>
                  <p className="text-center text-sm text-zinc-400">
                    Informe seu e-mail cadastrado para enviarmos as instruções de recuperação.
                  </p>
                  <form onSubmit={handleRequest} className="space-y-4 pt-2">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                        <Mail className="w-4 h-4" />
                        E-mail
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="voce@exemplo.com"
                        className="bg-transparent border-zinc-600 text-white placeholder:text-zinc-500"
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? 'Enviando...' : 'Enviar instruções'}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full text-zinc-300 hover:text-white" onClick={() => router.push('/')}>
                      Voltar ao login
                    </Button>
                  </form>
                </>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}