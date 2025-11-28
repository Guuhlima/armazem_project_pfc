'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock, Package } from 'lucide-react';
import { api, apiAuth } from '@/services/api';
import { useIsClient } from '@/hooks/useIsClient';
import Swal from 'sweetalert2';

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
        { email, senha }
      );

      const { accessToken, refreshToken, token, user } = res.data || {};
      const at = accessToken ?? token; // Pega accessToken ou 'token' como fallback
      if (!at) throw new Error('Token não retornado pelo backend');

      // Salva no localStorage
      localStorage.setItem('accessToken', at);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      if (user) localStorage.setItem('user', JSON.stringify(user));

      api.defaults.headers.common.Authorization = `Bearer ${at}`;

      window.dispatchEvent(new Event('auth:changed'));

      router.replace('/home');

    } catch (error: any) {
      console.error('Erro ao realizar login:', error);


      let title = 'Erro no Login';
      let text = 'Ocorreu um erro inesperado. Tente novamente.';
      let icon: 'error' | 'warning' = 'error';

      // Verifica se é um erro da API (Axios)
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        text = data?.error || data?.message || text;

        if (status === 401) { // Credenciais Inválidas
          title = 'Credenciais Inválidas';
          icon = 'warning';
          text = 'E-mail ou senha incorretos. Verifique seus dados.';
        } else if (status === 400) {
          title = 'Requisição Inválida';
          icon = 'warning';
          text = `Dados inválidos: ${text}`;
        } else if (status >= 500) {
          title = 'Erro no Servidor';
          text = 'Ocorreu um problema no servidor. Tente novamente mais tarde.';
        }
      } else if (error.request) { // Erro de rede (não conseguiu conectar)
        title = 'Erro de Conexão';
        text = 'Não foi possível conectar ao servidor. Verifique sua rede.';
      } else {
        text = error.message || text;
      }

      Swal.fire({
        title: title,
        text: text,
        icon: icon,
        timer: 3000,
        showConfirmButton: false,
        background: '#0b0b0b',
        color: '#e5e7eb',
        customClass: { popup: 'rounded-xl' }
      });

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
              <h2 className="text-3xl font-bold text-center text-white">
                Acesso ao Sistema
              </h2>

              <p className="text-center text-sm text-zinc-400">
                Insira suas credenciais para continuar
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-transparent border-zinc-600 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                    <Lock className="w-4 h-4" />
                    Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="bg-transparent border-zinc-600 text-white placeholder:text-zinc-500"
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
                  className="font-semibold underline hover:text-white"
                >
                  Criar conta
                </button>
              </div>

              <div className="text-center text-sm text-zinc-400">
                Esqueceu a senha?{' '}
                <button
                  onClick={() => router.push('/auth/reset_password')}
                  className="font-semibold underline hover:text-white"
                >
                  Resetar Senha
                </button>
              </div>

              <p className="text-xs text-zinc-400 text-center">
                © {new Date().getFullYear()} Armazem G3. Todos os direitos reservados.
              </p>

            </motion.div>

          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}