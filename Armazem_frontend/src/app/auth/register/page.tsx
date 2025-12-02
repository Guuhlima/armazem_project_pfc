'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Mail, Lock, Package } from 'lucide-react';
import api from '@/services/api';
import Swal from 'sweetalert2';
import Footer from '@/components/Footer';

export default function Register() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  const abrirPoliticaPrivacidade = async () => {
    await Swal.fire({
      title: 'Política de Privacidade & Cookies',
      width: 800,
      background: '#0b0b0b',
      color: '#e5e7eb',
      showCloseButton: true,
      confirmButtonText: 'Fechar',
      buttonsStyling: false,
      customClass: {
        confirmButton:
          'px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
        closeButton:
          'text-zinc-400 hover:text-zinc-200 focus:outline-none',
        popup: 'rounded-xl',
        title: 'text-lg font-semibold',
      },
      html: `
        <div style="text-align:left; max-height:60vh; overflow:auto; padding-right:6px">
          <p style="margin:0 0 12px">Valorizamos sua privacidade. Abaixo explicamos de forma clara como tratamos seus dados pessoais.</p>
          <h3 style="margin:16px 0 8px">1. Quais dados coletamos</h3>
          <ul style="margin-left:18px">
            <li><strong>Nome</strong></li>
            <li><strong>Email</strong></li>
            <li><strong>Número de telefone</strong> (opcional, para integrações)</li>
            <li><strong>Cookies</strong> estritamente necessários para cadastro, sessão e segurança</li>
          </ul>
          <h3 style="margin:16px 0 8px">2. Como usamos seus dados</h3>
          <ul style="margin-left:18px">
            <li><strong>Email</strong>: confirmação de conta, recuperação de acesso e comunicações essenciais.</li>
            <li><strong>Número de telefone</strong>: envio de <strong>notificações via Telegram</strong> (opcional) para acompanhamento de equipamentos e status no estoque.</li>
            <li><strong>Cookies</strong>: manter sessão, lembrar preferências e proteger contra uso indevido.</li>
          </ul>
          <h3 style="margin:16px 0 8px">3. Base legal</h3>
          <ul style="margin-left:18px">
            <li><strong>Consentimento</strong> (cookies/comunicações opcionais)</li>
            <li><strong>Execução de contrato</strong> (criar e gerenciar sua conta)</li>
            <li><strong>Interesse legítimo</strong> (segurança e melhoria)</li>
          </ul>
          <h3 style="margin:16px 0 8px">4. Segurança</h3>
          <ul style="margin-left:18px">
            <li>Senha com hash <code>bcrypt</code></li>
            <li>Controles de acesso e logs relevantes</li>
          </ul>
          <h3 style="margin:16px 0 8px">5. Retenção</h3>
          <p>Mantemos os dados pelo tempo necessário às finalidades legais/operacionais.</p>
          <h3 style="margin:16px 0 8px">6. Compartilhamento</h3>
          <ul style="margin-left:18px">
            <li>Fornecedores (hospedagem, email, integrações)</li>
            <li>Telegram (apenas se você conectar)</li>
          </ul>
          <h3 style="margin:16px 0 8px">7. Seus direitos</h3>
          <ul style="margin-left:18px">
            <li>Acessar, corrigir, atualizar e solicitar exclusão</li>
            <li>Revogar consentimento quando aplicável</li>
          </ul>
          <h3 style="margin:16px 0 8px">8. Contato</h3>
          <p>suporteg3@gmail.com</p>
          <p style="font-size:12px; color:#9ca3af; margin-top:10px">
            Última atualização: ${new Date().toLocaleDateString()}
          </p>
        </div>
      `,
    });
  };

  const pedirConsentimento = async (): Promise<boolean> => {
    const { value: aceitou } = await Swal.fire({
      title: 'Termos & Cookies',
      background: '#0b0b0b',
      color: '#e5e7eb',
      html: `
        <div style="text-align:left">
          <p style="margin:0 0 8px">
            Para criar sua conta, precisamos do seu consentimento quanto ao uso de cookies e ao tratamento de dados conforme nossa
            <button id="openPolicy" type="button" style="background:none;border:none;padding:0;margin:0;color:#60a5fa;cursor:pointer;text-decoration:underline">
              Política de Privacidade
            </button>.
          </p>
          <label style="display:flex;align-items:center;gap:8px;margin-top:12px;">
            <input type="checkbox" id="consentChk"/>
            <span>Eu li e aceito os Termos e a Política de Privacidade.</span>
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Aceitar e continuar',
      cancelButtonText: 'Cancelar',
      showCloseButton: true,
      buttonsStyling: false,
      customClass: {
        confirmButton:
          'px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500',
        cancelButton:
          'px-4 py-2 rounded-md bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600 focus:outline-none',
        closeButton: 'text-zinc-400 hover:text-zinc-200 focus:outline-none',
        popup: 'rounded-xl',
        title: 'text-lg font-semibold',
      },
      didOpen: () => {
        const btn = document.getElementById('openPolicy');
        btn?.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await abrirPoliticaPrivacidade();
        });
      },
      preConfirm: () => {
        const chk = document.getElementById('consentChk') as HTMLInputElement | null;
        if (!chk?.checked) {
          Swal.showValidationMessage('Você precisa aceitar para continuar.');
          return false;
        }
        return true;
      },
    });

    return !!aceitou;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (senha !== confirmar) {
      Swal.fire({
        title: 'Erro de Validação',
        text: 'As senhas digitadas não coincidem.',
        icon: 'error',
        timer: 2500,
        showConfirmButton: false,
        background: '#0b0b0b',
        color: '#e5e7eb',
        customClass: { popup: 'rounded-xl' }
      });
      return;
    }

    if (senha.length < 6) {
      Swal.fire({
        title: 'Senha Muito Curta',
        text: 'Sua senha deve ter pelo menos 6 caracteres.',
        icon: 'warning',
        timer: 2500,
        showConfirmButton: false,
        background: '#0b0b0b',
        color: '#e5e7eb',
        customClass: { popup: 'rounded-xl' }
      });
      return;
    }

    const aceitou = await pedirConsentimento();
    if (!aceitou) return;

    setLoading(true);
    try {
      await api.post('/user/cadastro', {
        nome,
        email,
        senha,
        aceiteCookies: true,
      });

      await Swal.fire({
        title: 'Sucesso',
        text: 'Conta criada, redirecionando...',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: '#0b0b0b',
        color: '#e5e7eb',
      });

      router.push('/home');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.response?.data?.message;

      Swal.fire({
        title:
          status === 409 ? 'Email já em uso' :
          status === 400 ? 'Termos não aceitos' :
          'Erro ao cadastrar',
        text:
          status === 409 ? 'Este email já está cadastrado.' :
          status === 400 ? 'É necessário aceitar os termos para criar a conta.' :
          (msg || 'Tente novamente em instantes.'),
        icon: status && status < 500 ? 'warning' : 'error',
        background: '#0b0b0b',
        color: '#e5e7eb',
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark">
      <main className="min-h-screen flex flex-col relative overflow-hidden bg-zinc-900 text-zinc-100">
        {/* background */}
        <div
          className="absolute inset-0 z-0 animate-pan-grid"
          style={{
            backgroundColor: '#18181b',
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* área central com flex-1 para empurrar o footer */}
        <div className="flex-1 flex items-center justify-between p-16 relative z-10">
          {/* branding */}
          <motion.div
            className="flex flex-col"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          >
            <div className="flex items-center gap-4">
              <Package className="w-12 h-12 text-blue-500" />
              <h1 className="text-5xl font-bold">
                Armazem Integrado <span className="text-blue-500">G3</span>
              </h1>
            </div>
            <p className="text-xl text-zinc-400 mt-2 ml-[64px]">
              Plataforma de Gestão de Estoque
            </p>
          </motion.div>

          {/* card de cadastro */}
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
                  <h2 className="text-3xl font-bold text-center">Criar conta</h2>
                  <p className="text-center text-sm text-zinc-400">
                    Preencha seus dados para começar
                  </p>

                  <form onSubmit={handleRegister} className="space-y-4" autoComplete="on">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                        <User className="w-4 h-4" />
                        Nome
                      </label>
                      <Input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        autoComplete="name"
                        className="bg-transparent border-zinc-600 text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        inputMode="email"
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
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="bg-transparent border-zinc-600 text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
                        <Lock className="w-4 h-4" />
                        Confirmar senha
                      </label>
                      <Input
                        type="password"
                        value={confirmar}
                        onChange={(e) => setConfirmar(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="bg-transparent border-zinc-600 text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? 'Criando...' : 'Criar conta'}
                    </Button>

                    <p className="text-center text-xs text-zinc-400">
                      Ao prosseguir você concorda com nossa{' '}
                      <button
                        type="button"
                        onClick={abrirPoliticaPrivacidade}
                        className="underline hover:text-white"
                      >
                        Política de Privacidade & Cookies
                      </button>.
                    </p>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-zinc-300 hover:text-white"
                      onClick={() => router.push('/')}
                      disabled={loading}
                    >
                      Já tenho conta
                    </Button>
                  </form>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* footer preto */}
        <div className="relative z-10 bg-black border-t border-zinc-800">
          <Footer />
        </div>
      </main>
    </div>
  );
}
