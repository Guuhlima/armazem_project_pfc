"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin } from "lucide-react";

type ModalContent = "termos" | "politica" | null;

type PolicyModalProps = {
    title: string;
    content: React.ReactNode;
    onClose: () => void;
};

function PolicyModal({ title, content, onClose }: PolicyModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="max-w-lg w-full mx-4 rounded-xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 text-sm"
                    >
                        ✕
                    </button>
                </div>
                <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
                    {content}
                </div>
                <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Footer() {
    const ano = new Date().getFullYear();
    const [activeModal, setActiveModal] = useState<ModalContent>(null);

    const openModal =
        (type: ModalContent) =>
            (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                e.preventDefault();
                setActiveModal(type);
            };

    const closeModal = () => setActiveModal(null);

    const getModalContent = (type: ModalContent) => {
        if (type === "termos") {
            return {
                title: "Termos de Uso - Armazém Integrado G3",
                text: (
                    <div className="space-y-3 text-sm leading-relaxed">
                        <p>
                            Estes Termos de Uso (&quot;Termos&quot;) regulam o uso da
                            plataforma <strong>Armazém Integrado G3</strong> (&quot;Plataforma&quot;),
                            destinada à gestão de estoque, controle de equipamentos,
                            movimentações (entradas, saídas, transferências) e acompanhamento
                            de tarefas de contagem.
                        </p>

                        <h3 className="font-semibold mt-2">1. Aceite dos Termos</h3>
                        <p>
                            Ao criar uma conta, acessar ou utilizar a Plataforma, você
                            (&quot;Usuário&quot;) declara que leu, entendeu e concorda com estes Termos
                            e com a nossa Política de Privacidade &amp; Cookies. Caso não
                            concorde, você não deve utilizar a Plataforma.
                        </p>

                        <h3 className="font-semibold mt-2">2. Cadastro e Conta</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>Para usar a Plataforma, é necessário criar uma conta.</li>
                            <li>
                                Você se compromete a fornecer informações verdadeiras, completas
                                e atualizadas.
                            </li>
                            <li>
                                Você é responsável por manter a confidencialidade de sua senha e
                                pelo uso da sua conta.
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">3. Uso da Plataforma</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>
                                A Plataforma destina-se à gestão de estoque, inventário e
                                armazéns (como acompanhamento de equipamentos, posições,
                                contagens, etc.).
                            </li>
                            <li>
                                É proibido utilizar a Plataforma para fins ilícitos, para
                                violar direitos de terceiros ou comprometer a segurança do
                                sistema.
                            </li>
                            <li>
                                Podemos, a qualquer momento, atualizar funcionalidades,
                                corrigir erros e melhorar a experiência de uso.
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">4. Responsabilidades</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>
                                O Usuário é responsável pela veracidade dos dados lançados na
                                Plataforma (ex.: quantidades, movimentações, cadastros).
                            </li>
                            <li>
                                O Armazém Integrado G3 não se responsabiliza por decisões
                                operacionais ou financeiras tomadas com base nas informações
                                lançadas pelo próprio Usuário.
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">5. Privacidade e LGPD</h3>
                        <p>
                            O tratamento de dados pessoais segue a nossa{" "}
                            <strong>Política de Privacidade &amp; Cookies</strong>, em
                            conformidade com a Lei Geral de Proteção de Dados (Lei nº
                            13.709/2018). Ao utilizar a Plataforma, você concorda com esse
                            tratamento, nos limites descritos na política.
                        </p>

                        <h3 className="font-semibold mt-2">6. Cookies</h3>
                        <p>
                            Utilizamos cookies estritamente necessários para autenticação,
                            manutenção de sessão, segurança e algumas preferências de
                            interface. Você poderá gerenciar cookies no seu navegador, mas
                            certas funcionalidades podem ser impactadas.
                        </p>

                        <h3 className="font-semibold mt-2">7. Suspensão e Encerramento</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>
                                Podemos suspender ou encerrar o acesso à sua conta em caso de
                                violação destes Termos, uso indevido, tentativa de fraude ou
                                risco à segurança da Plataforma.
                            </li>
                            <li>
                                Você pode solicitar o encerramento da conta pelos canais de
                                suporte. Alguns dados poderão ser mantidos para cumprimento de
                                obrigações legais.
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">8. Alterações destes Termos</h3>
                        <p>
                            Estes Termos podem ser atualizados periodicamente para refletir
                            melhorias, adequações legais ou mudanças de serviço. Quando
                            alterações relevantes forem realizadas, poderemos notificá-lo
                            pelos canais de contato cadastrados ou por aviso na própria
                            Plataforma.
                        </p>

                        <h3 className="font-semibold mt-2">9. Contato</h3>
                        <p>
                            Em caso de dúvidas sobre estes Termos, entre em contato pelo
                            e-mail:{" "}
                            <a
                                href="mailto:suporteg3@gmail.com"
                                className="text-blue-500 hover:underline"
                            >
                                suporteg3@gmail.com
                            </a>
                            .
                        </p>
                    </div>
                ),
            };
        }

        if (type === "politica") {
            return {
                title: "Política de Privacidade & Cookies - Armazém Integrado G3",
                text: (
                    <div className="space-y-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
                        <p>
                            Valorizamos sua privacidade. Abaixo explicamos de forma clara como
                            tratamos seus dados pessoais.
                        </p>

                        <h3 className="font-semibold mt-2">1. Quais dados coletamos</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>
                                <strong>Nome</strong>
                            </li>
                            <li>
                                <strong>Email</strong>
                            </li>
                            <li>
                                <strong>Número de telefone</strong> (opcional, para integrações)
                            </li>
                            <li>
                                <strong>Cookies</strong> estritamente necessários para cadastro,
                                sessão e segurança
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">2. Como usamos seus dados</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>
                                <strong>Email</strong>: confirmação de conta, recuperação de
                                acesso e comunicações essenciais.
                            </li>
                            <li>
                                <strong>Número de telefone</strong>: envio de{" "}
                                <strong>notificações via Telegram</strong> (caso você opte por
                                vincular), para <strong>acompanhamento e evolução</strong> de
                                equipamentos e do <strong>status do usuário no estoque</strong>.
                            </li>
                            <li>
                                <strong>Cookies</strong>: manter sua sessão, lembrar
                                preferências e proteger contra uso indevido.
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">3. Base legal</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>
                                <strong>Consentimento</strong>: para uso de cookies e
                                comunicações opcionais (ex.: Telegram).
                            </li>
                            <li>
                                <strong>Execução de contrato</strong>: criar e gerenciar sua
                                conta e operações de estoque.
                            </li>
                            <li>
                                <strong>Interesse legítimo</strong>: segurança da conta,
                                prevenção a fraudes e melhoria do serviço.
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">4. Segurança</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>
                                Senha armazenada de forma irreversível (hash com{" "}
                                <code className="text-xs">bcrypt</code>).
                            </li>
                            <li>Controles de acesso e registro de atividades relevantes.</li>
                        </ul>

                        <h3 className="font-semibold mt-2">5. Retenção</h3>
                        <p>
                            Mantemos os dados pelo tempo necessário às finalidades
                            legais/operacionais. Você pode solicitar exclusão quando
                            permitido.
                        </p>

                        <h3 className="font-semibold mt-2">6. Compartilhamento</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>
                                Fornecedores que nos ajudam a prestar o serviço (hospedagem,
                                e-mail, integrações, etc.).
                            </li>
                            <li>
                                Telegram (apenas se você optar por conectar o bot para
                                notificações).
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">7. Seus direitos</h3>
                        <ul className="list-disc ml-5 space-y-1">
                            <li>Acessar, corrigir, atualizar e solicitar exclusão dos dados.</li>
                            <li>
                                Revogar o consentimento a qualquer momento, quando essa for a
                                base legal.
                            </li>
                        </ul>

                        <h3 className="font-semibold mt-2">8. Contato</h3>
                        <p>
                            Em caso de dúvidas, fale com a gente:{" "}
                            <a
                                href="mailto:suporteg3@gmail.com"
                                className="text-blue-500 hover:underline"
                            >
                                suporteg3@gmail.com
                            </a>
                            .
                        </p>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Última atualização: {new Date().toLocaleDateString()}
                        </p>
                    </div>
                ),
            };
        }

        return null;
    };

    const modalProps = getModalContent(activeModal);

    return (
        <>
            <footer className="mt-10 border-t border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100">
                <div className="max-w-6xl mx-auto px-4 py-10 lg:py-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                G3
                            </div>
                            <h2 className="text-lg font-semibold tracking-tight">
                                Armazém Integrado G3
                            </h2>
                        </div>

                        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Plataforma de gestão de estoque e armazéns. Organize entradas,
                            saídas, contagens e acompanhe o inventário em tempo real.
                        </p>

                        <div className="mt-4 flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                            <button className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 hover:border-blue-500/60 hover:text-blue-500 transition-colors">
                                <Facebook size={18} />
                            </button>
                            <button className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 hover:border-pink-500/70 hover:text-pink-500 transition-colors">
                                <Instagram size={18} />
                            </button>
                            <button className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 hover:border-sky-500/70 hover:text-sky-500 transition-colors">
                                <Twitter size={18} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-50 uppercase mb-3">
                            Links Rápidos
                        </h2>
                        <nav className="flex flex-col gap-2 text-sm">
                            <Link
                                href="/"
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Início
                            </Link>
                            <Link
                                href="/home"
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/estoque/acess"
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Meu Armazém
                            </Link>
                            <Link
                                href="/equipamento/create"
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Novo Equipamento
                            </Link>
                        </nav>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-50 uppercase mb-3">
                            Suporte
                        </h2>
                        <nav className="flex flex-col gap-2 text-sm">
                            <Link
                                href="/central-ajuda"
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Central de Ajuda
                            </Link>
                            <Link
                                href="/termos"
                                onClick={openModal("termos")}
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Termos de Uso
                            </Link>
                            <Link
                                href="/politica"
                                onClick={openModal("politica")}
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Política de Privacidade &amp; Cookies
                            </Link>
                            <a
                                href="mailto:suporteg3@gmail.com"
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Contato
                            </a>
                            <Link
                                href="/faq"
                                className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                FAQ
                            </Link>
                        </nav>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-50 uppercase mb-3">
                            Contato
                        </h2>

                        <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center gap-3">
                                <MapPin className="shrink-0" size={18} />
                                <p>São Paulo - SP, Brasil</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <Mail className="shrink-0" size={18} />
                                <p>suporteg3@gmail.com</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <Phone className="shrink-0" size={18} />
                                <p>(11) 97457-9013</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-200/80 dark:border-zinc-800" />

                <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <p>© {ano} Armazém Integrado G3. Todos os direitos reservados.</p>

                    <div className="flex gap-4">
                        <button className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                            Política de Cookies
                        </button>
                        <button className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                            LGPD
                        </button>
                    </div>
                </div>
            </footer>

            {activeModal && modalProps && (
                <PolicyModal
                    title={modalProps.title}
                    content={modalProps.text}
                    onClose={closeModal}
                />
            )}
        </>
    );
}
