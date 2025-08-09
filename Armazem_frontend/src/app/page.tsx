'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock } from 'lucide-react';
import api from '@/services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post('/user/login', { email, senha});

      const { token, user } = res.data

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      router.push('/home');
    } catch (error) {
      console.error('Erro ao realizar login:', error);
      alert('Erro ao realizar login');
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
            <h2 className="text-3xl font-bold text-center text-zinc-800 dark:text-white">Acesso ao Sistema</h2>
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Insira suas credenciais para continuar</p>

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

              <Button type="submit" className="w-full" variant="default" size="lg">
                Entrar
              </Button>
            </form>

            <p className="text-xs text-zinc-400 text-center">
              © {new Date().getFullYear()} Gustavo Inc. Todos os direitos reservados.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
};

export default Login;
