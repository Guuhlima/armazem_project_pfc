'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Mail, IdCard, Lock } from 'lucide-react';
import api from '@/services/api';

export default function Register() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) {
      alert('As senhas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      alert('A senha deve ter ao menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/user/cadastro', { nome, email, matricula, senha });

      alert('Conta criada com sucesso! Faça login para continuar.');
      router.push('/home');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        alert('Email já está em uso.');
      } else {
        console.error(err);
        alert('Erro ao cadastrar. Tente novamente.');
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
            <h2 className="text-3xl font-bold text-center text-zinc-800 dark:text-white">Criar conta</h2>
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Preencha seus dados para começar</p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  <User className="w-4 h-4" />
                  Nome
                </label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  <IdCard className="w-4 h-4" />
                  Matrícula
                </label>
                <Input value={matricula} onChange={(e) => setMatricula(e.target.value)} required />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  <Lock className="w-4 h-4" />
                  Senha
                </label>
                <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  <Lock className="w-4 h-4" />
                  Confirmar senha
                </label>
                <Input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Criando...' : 'Criar conta'}
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/login')}>
                Já tenho conta
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
