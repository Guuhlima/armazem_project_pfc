'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock } from 'lucide-react';
import api, { apiAuth } from '@/services/api';
import { useIsClient } from '@/hooks/useIsClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isClient = useIsClient();
  if (!isClient) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiAuth.post(
        '/user/login',
        { email, senha },
        { withCredentials: true }
      );

      const { accessToken, refreshToken, token, user } = res.data || {};
      const at = accessToken ?? token;
      if (!at) throw new Error('Token não retornado pelo backend');

      localStorage.setItem('accessToken', at);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      if (user) localStorage.setItem('user', JSON.stringify(user));

      api.defaults.headers.common.Authorization = `Bearer ${at}`;
      apiAuth.defaults.headers.common.Authorization = `Bearer ${at}`;

      window.dispatchEvent(new Event('auth:changed'));

      router.replace('/home');
      router.refresh();
    } catch (error: any) {
      console.error('Erro ao realizar login:', error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao realizar login';
      alert(msg);
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
            <h2 className="text-3xl font-bold text-center text-zinc-800 dark:text-white">
              Acesso ao Sistema
            </h2>
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              Insira suas credenciais para continuar
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  <Lock className="w-4 h-4" />
                  Senha
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="text-center text-sm text-zinc-400">
              Não tem conta?{' '}
              <button
                onClick={() => router.push('/auth/register')}
                className="text-black underline underline-offset-4 hover:opacity-80"
              >
                Criar conta
              </button>
            </div>

            <div className="text-center text-sm text-zinc-400">
              Esqueceu a senha?{' '}
              <button
                onClick={() => router.push('/auth/reset_password')}
                className="text-black underline underline-offset-4 hover:opacity-80"
              >
                Resetar Senha
              </button>
            </div>

            <p className="text-xs text-zinc-400 text-center">
              © {new Date().getFullYear()} Gustavo Inc. Todos os direitos reservados.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
