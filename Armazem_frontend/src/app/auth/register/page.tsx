'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Mail, IdCard, Lock } from 'lucide-react';
import api from '@/services/api';
import Swal from 'sweetalert2';

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
          <p style="margin:0 0 12px">
            Valorizamos sua privacidade. Abaixo explicamos de forma clara como tratamos seus dados pessoais.
          </p>

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
            <li><strong>Número de telefone</strong>: envio de <strong>notificações via Telegram</strong> (caso você opte por vincular), para <strong>acompanhamento e evolução de equipamentos</strong> e do <strong>status do usuário no estoque</strong>.</li>
            <li><strong>Cookies</strong>: manter sua sessão, lembrar preferências e proteger contra uso indevido.</li>
          </ul>

          <h3 style="margin:16px 0 8px">3. Base legal</h3>
          <ul style="margin-left:18px">
            <li><strong>Consentimento</strong>: para uso de cookies e comunicações opcionais (ex.: Telegram).</li>
            <li><strong>Execução de contrato</strong>: criar e gerenciar sua conta e operações de estoque.</li>
            <li><strong>Interesse legítimo</strong>: segurança da conta, prevenção a fraudes e melhoria do serviço.</li>
          </ul>

          <h3 style="margin:16px 0 8px">4. Segurança</h3>
          <ul style="margin-left:18px">
            <li>Senha armazenada de forma irreversível (hash com <code>bcrypt</code>).</li>
            <li>Controles de acesso e registro de atividades relevantes.</li>
          </ul>

          <h3 style="margin:16px 0 8px">5. Retenção</h3>
          <p>Mantemos os dados pelo tempo necessário às finalidades legais/operacionais. Você pode solicitar exclusão quando permitido.</p>

          <h3 style="margin:16px 0 8px">6. Compartilhamento</h3>
          <ul style="margin-left:18px">
            <li>Fornecedores que nos ajudam a prestar o serviço (hospedagem, email, integrações).</li>
            <li>Telegram (apenas se você optar por conectar o bot para notificações).</li>
          </ul>

          <h3 style="margin:16px 0 8px">7. Seus direitos</h3>
          <ul style="margin-left:18px">
            <li>Acessar, corrigir, atualizar e solicitar exclusão dos seus dados.</li>
            <li>Revogar o consentimento a qualquer momento, quando essa for a base legal.</li>
          </ul>

          <h3 style="margin:16px 0 8px">8. Contato</h3>
          <p>Em caso de dúvidas, fale com a gente: <a href="mailto:suporteg3@gmail.com">suporteg3@gmail.com</a>.</p>

          <p style="font-size:12px; color:#9ca3af; margin-top:10px">
            Última atualização: ${new Date().toLocaleDateString()}
          </p>
        </div>
      `,
    });
  };

  // Popup de consentimento (SweetAlert2) com link que abre a política
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
        closeButton:
          'text-zinc-400 hover:text-zinc-200 focus:outline-none',
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

    if (senha !== confirmar) {
      alert('As senhas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      alert('A senha deve ter ao menos 6 caracteres.');
      return;
    }

    // 1) Pede consentimento antes de enviar
    const aceitou = await pedirConsentimento();
    if (!aceitou) return; // usuário cancelou ou não aceitou

    setLoading(true);
    try {
      const res = await api.post('/user/cadastro', {
        nome,
        email,
        senha,
        aceiteCookies: true,
      });

      Swal.fire({
        title: 'Sucesso',
        text: 'Conta criada, redirecionando...',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });

      router.push('/home');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        alert('Email já está em uso.');
      } else if (err?.response?.status === 400) {
        alert('É necessário aceitar os termos para criar a conta.');
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

              <p className="text-center text-xs text-zinc-500">
                Ao prosseguir você concorda com nossa{' '}
                <button
                  type="button"
                  onClick={abrirPoliticaPrivacidade}
                  className="underline hover:opacity-80"
                >
                  Política de Privacidade & Cookies
                </button>.
              </p>

              <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')}>
                Já tenho conta
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}