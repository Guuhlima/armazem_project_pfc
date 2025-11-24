import dns from 'node:dns';
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';

dns.setDefaultResultOrder?.('ipv4first');

let bot: TelegramBot | null = null;

export type TelegramResult = 'SENT' | 'NO_DESTS' | 'DISABLED' | 'ERROR';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
}

function escMd(s: string) {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function chunk(text: string, max = 4096) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += max) out.push(text.slice(i, i + max));
  return out;
}

async function getDestinatariosPorEstoque(estoqueId: number): Promise<string[]> {
  const rows = await prisma.estoqueTelegramNotify.findMany({
    where: { estoqueId },
    select: { chatId: true },
  });
  return Array.from(new Set(rows.map(r => r.chatId)));
}

async function upsertChatForUsuarioEstoque(usuarioId: number, estoqueId: number, chatId: string) {
  await prisma.estoqueTelegramNotify.upsert({
    where: { usuario_estoque_unique: { usuarioId, estoqueId } },
    update: { chatId },
    create: { usuarioId, estoqueId, chatId },
  });
}

async function getDestsForOD(origemId: number, destinoId: number): Promise<string[]> {
  const orig = await getDestinatariosPorEstoque(origemId);
  const dest = await getDestinatariosPorEstoque(destinoId);
  return Array.from(new Set([...orig, ...dest]));
}

async function upsertChatForEstoqueGlobal(estoqueId: number, chatId: string) {
  const existing = await prisma.estoqueTelegramNotify.findFirst({
    where: { estoqueId },
    select: { id: true },
  });

  if (existing) {
    await prisma.estoqueTelegramNotify.update({
      where: { id: existing.id },
      data: { chatId },
    });
  } else {
    await prisma.estoqueTelegramNotify.create({
      data: { estoqueId, chatId },
    });
  }
}

export async function startTelegram() {
  if (bot) return;

  const enabled = process.env.TELEGRAM_ENABLED === 'true';
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!enabled) {
    console.warn('[telegram] desabilitado (TELEGRAM_ENABLED != true)');
    return;
  }
  if (!token) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN ausente; serviço não iniciado');
    return;
  }

  bot = new TelegramBot(token, {
    polling: { interval: 300, params: { timeout: 30 } },
  });

  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true }),
    });
  } catch (e) {
    console.warn('[telegram] deleteWebhook (HTTP) falhou:', (e as any)?.toString?.());
  }

  try {
    const me = await bot.getMe();
    console.log(`[telegram] iniciado como @${me.username} (polling)`);
  } catch (e) {
    console.error('[telegram] getMe falhou, token inválido?', e);
  }

  bot.on('polling_error', (err) => {
    console.warn('[telegram] polling_error:', (err as any)?.code || err?.toString?.());
  });
  bot.on('webhook_error', (err) => {
    console.warn('[telegram] webhook_error:', err?.toString?.());
  });

  bot.on('message', (msg) => {
    const from = [msg.chat.type, msg.chat.title || msg.chat.username || msg.chat.id].join(':');
    console.log('[telegram] message <=', from, msg.text);
  });

  const cmdChatId = /^\/chatid(?:@[\w_]+)?\b/i;
  bot.onText(cmdChatId, async (msg) => {
    const chatId = String(msg.chat.id);
    await bot!.sendMessage(
      chatId,
      `✅ O chat_id deste chat é: <code>${escHtml(chatId)}</code>`,
      { parse_mode: 'HTML' }
    );
  });

  const cmdStart = /^\/start(?:@[\w_]+)?\b/i;
  bot.onText(cmdStart, async (msg) => {
    const chatId = String(msg.chat.id);
    await bot!.sendMessage(
      chatId,
      escHtml('Olá! Envie /chatid para ver o ID deste chat.'),
      { disable_web_page_preview: true, parse_mode: 'HTML' }
    );
  });

  bot.setMyCommands([
    { command: 'start', description: 'Iniciar o bot' },
    { command: 'chatid', description: 'Exibe o chat_id deste chat' },
  ]).catch(() => {});

  process.once('SIGINT', stopTelegram);
  process.once('SIGTERM', stopTelegram);
}

export async function stopTelegram() {
  if (!bot) return;
  try { await bot.stopPolling(); } catch {}
  bot = null;
  console.log('[telegram] parado');
}

// =================== HTML MODE A PARTIR DAQUI ===================

// Agora retorna TelegramResult
async function sendWithHtml(chatId: string, textHtml: string): Promise<TelegramResult> {
  if (!bot) return 'DISABLED';
  try {
    for (const part of chunk(textHtml)) {
      await bot.sendMessage(chatId, part, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    }
    return 'SENT';
  } catch (e: any) {
    const code = e?.response?.statusCode ?? e?.statusCode;
    const desc = e?.response?.body?.description ?? e?.message;
    console.error('Telegram sendMessage failed', { chatId, code, desc });

    if (code === 403 || String(desc || '').includes('bot was blocked by the user')) {
      await prisma.estoqueTelegramNotify.deleteMany({ where: { chatId } }).catch(() => {});
    }
    return 'ERROR';
  }
}

// helper para enviar a vários destinos e consolidar resultado
async function sendToMany(html: string, dests: string[]): Promise<TelegramResult> {
  if (!bot) return 'DISABLED';
  if (!dests.length) return 'NO_DESTS';
  const results = await Promise.all(dests.map(id => sendWithHtml(id, html)));
  return results.some(r => r === 'SENT') ? 'SENT' : results[0] ?? 'ERROR';
}

export const TelegramService = {
  async safeSendRaw(chatId: string, html: string): Promise<TelegramResult> {
    return sendWithHtml(chatId, html);
  },

  async safeSendPlain(chatId: string, text: string): Promise<TelegramResult> {
    return sendWithHtml(chatId, escHtml(text));
  },

  async sendTransferNotification(params: {
    estoqueOrigemId: number;
    estoqueDestinoId: number;
    itemNome: string;
    quantidade: number;
    usuario: string;
    transferenciaId: number;
    quando: Date;
  }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';

    const t = params;
    const dests = Array.from(new Set([
      ...(await getDestinatariosPorEstoque(t.estoqueOrigemId)),
      ...(await getDestinatariosPorEstoque(t.estoqueDestinoId)),
    ]));
    console.log('[telegram] transfer notify dests:', {
      origem: t.estoqueOrigemId,
      destino: t.estoqueDestinoId,
      dests,
    });
    if (!dests.length) return 'NO_DESTS';

    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(t.quando);

    const html =
      `📦 <b>Nova transferência de equipamento</b>\n` +
      `<b>Item:</b> ${escHtml(t.itemNome)}\n` +
      `<b>Quantidade:</b> ${t.quantidade}\n` +
      `<b>De:</b> #${t.estoqueOrigemId} → <b>Para:</b> #${t.estoqueDestinoId}\n` +
      `<b>Por:</b> ${escHtml(t.usuario)}\n` +
      `<b>ID:</b> ${t.transferenciaId}\n` +
      `<b>Quando:</b> ${escHtml(quandoFmt)}`;

    return sendToMany(html, dests);
  },

 async sendAgendamentoCreatedNotification(p: {
    agendamentoId: number;
    itemNome: string;
    quantidade: number;
    estoqueOrigemId: number;
    estoqueDestinoId: number;
    executarEm: Date;
    usuario: string;
  }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';
    const dests = await getDestsForOD(p.estoqueOrigemId, p.estoqueDestinoId);
    if (!dests.length) return 'NO_DESTS';

    const executarEmFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(p.executarEm);

    const html =
      `🗓️ <b>Agendamento criado</b>\n` +
      `<b>ID:</b> ${p.agendamentoId}\n` +
      `<b>Item:</b> ${escHtml(p.itemNome)}\n` +
      `<b>Quantidade:</b> ${p.quantidade}\n` +
      `<b>De:</b> #${p.estoqueOrigemId} → <b>Para:</b> #${p.estoqueDestinoId}\n` +
      `<b>Executar em:</b> ${escHtml(executarEmFmt)}\n` +
      `<b>Por:</b> ${escHtml(p.usuario)}`;

    return sendToMany(html, dests);
  },

  async sendAgendamentoCanceledNotification(p: {
    agendamentoId: number;
    itemNome: string;
    quantidade: number;
    estoqueOrigemId: number;
    estoqueDestinoId: number;
    executarEm: Date;
    usuario: string;
  }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';
    const dests = await getDestsForOD(p.estoqueOrigemId, p.estoqueDestinoId);
    if (!dests.length) return 'NO_DESTS';

    const executarEmFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(p.executarEm);

    const html =
      `❌ <b>Agendamento cancelado</b>\n` +
      `<b>ID:</b> ${p.agendamentoId}\n` +
      `<b>Item:</b> ${escHtml(p.itemNome)}\n` +
      `<b>Quantidade:</b> ${p.quantidade}\n` +
      `<b>De:</b> #${p.estoqueOrigemId} → <b>Para:</b> #${p.estoqueDestinoId}\n` +
      `<b>Executaria em:</b> ${escHtml(executarEmFmt)}\n` +
      `<b>Por:</b> ${escHtml(p.usuario)}`;

    return sendToMany(html, dests);
  },

  async sendAgendamentoExecutedNotification(p: {
    agendamentoId: number;
    transferenciaId: number;
    quando: Date;
    itemNome: string;
    quantidade: number;
    estoqueOrigemId: number;
    estoqueDestinoId: number;
  }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';
    const dests = await getDestsForOD(p.estoqueOrigemId, p.estoqueDestinoId);
    if (!dests.length) return 'NO_DESTS';

    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(p.quando);

    const html =
      `✅ <b>Agendamento executado</b>\n` +
      `<b>Agendamento:</b> ${p.agendamentoId}\n` +
      `<b>Transferência:</b> ${p.transferenciaId}\n` +
      `<b>Quando:</b> ${escHtml(quandoFmt)}\n` +
      `<b>Item:</b> ${escHtml(p.itemNome)}\n` +
      `<b>Quantidade:</b> ${p.quantidade}\n` +
      `<b>De:</b> #${p.estoqueOrigemId} → <b>Para:</b> #${p.estoqueDestinoId}`;

    return sendToMany(html, dests);
  },

  async sendAgendamentoFailedNotification(p: {
    agendamentoId: number;
    itemNome: string;
    quantidade: number;
    estoqueOrigemId: number;
    estoqueDestinoId: number;
    errorMessage: string;
  }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';
    const dests = await getDestsForOD(p.estoqueOrigemId, p.estoqueDestinoId);
    if (!dests.length) return 'NO_DESTS';

    const html =
      `⚠️ <b>Falha no agendamento</b>\n` +
      `<b>ID:</b> ${p.agendamentoId}\n` +
      `<b>Item:</b> ${escHtml(p.itemNome)}\n` +
      `<b>Quantidade:</b> ${p.quantidade}\n` +
      `<b>De:</b> #${p.estoqueOrigemId} → <b>Para:</b> #${p.estoqueDestinoId}\n` +
      `<b>Erro:</b> ${escHtml(p.errorMessage)}`;

    return sendToMany(html, dests);
  },

  async sendAutoReposicaoPlannedNotification(p: {
    estoqueOrigemId: number;
    estoqueDestinoId: number;
    itemId: number;
    itemNome: string;
    quantidadeTransferir: number;

    qtdOrigAntes: number;
    qtdDestAntes: number;
    qtdOrigDepois: number;
    qtdDestDepois: number;

    minimoDestino: number;
    faltando: number;
    motivo?: string;
  }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';

    const dests = await getDestsForOD(p.estoqueOrigemId, p.estoqueDestinoId);
    if (!dests.length) return 'NO_DESTS';

    const motivo = p.motivo ? escHtml(p.motivo) : 'Auto-reposição entre estoques';

    const html =
      `🤖 <b>Auto-reposição programada</b>\n` +
      `<b>Motivo:</b> ${motivo}\n` +
      `<b>Item:</b> ${escHtml(p.itemNome)} (ID ${p.itemId})\n` +
      `<b>Quantidade a transferir:</b> ${p.quantidadeTransferir}\n` +
      `<b>De:</b> #${p.estoqueOrigemId}  ( ${p.qtdOrigAntes} → ${p.qtdOrigDepois} )\n` +
      `<b>Para:</b> #${p.estoqueDestinoId} ( ${p.qtdDestAntes} → ${p.qtdDestDepois} )\n` +
      `<b>Mínimo destino:</b> ${p.minimoDestino}` +
      (p.faltando > 0
        ? `\n<b>Ainda faltando:</b> ${p.faltando} para atingir o alvo.`
        : '');

    return sendToMany(html, dests);
  },

  async sendAccessRequestNotification(params: {
    estoqueId: number;
    solicitante: string;
    motivo?: string;
    solicitacaoId: number;
    quando: Date;
  }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';

    const s = params;
    const dests = await getDestinatariosPorEstoque(s.estoqueId);
    if (!dests.length) return 'NO_DESTS';

    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(s.quando);

    const html =
      `🔐 <b>Nova solicitação de acesso</b> ao estoque #${s.estoqueId}\n` +
      `<b>Solicitante:</b> ${escHtml(s.solicitante)}\n` +
      (s.motivo ? `<b>Motivo:</b> ${escHtml(s.motivo)}\n` : '') +
      `<b>ID:</b> ${s.solicitacaoId}\n` +
      `<b>Quando:</b> ${escHtml(quandoFmt)}`;

    return sendToMany(html, dests);
  },

  async sendTestForEstoque(estoqueId: number, opts?: { chatId?: string; text?: string }) {
    if (!bot) throw new Error('Telegram bot não iniciado');
    let chatId = opts?.chatId?.trim();

    if (!chatId) {
      const dests = await getDestinatariosPorEstoque(estoqueId);
      chatId = dests[0];
    }
    if (!chatId) throw new Error('chatId não configurado para este estoque');

    const text = opts?.text ?? `✅ Teste de notificação do estoque #${estoqueId}`;
    return this.safeSendPlain(chatId, text);
  },

  async sendTestForUsuarioEstoque(usuarioId: number, estoqueId: number, text?: string) {
    if (!bot) throw new Error('Telegram bot não iniciado');

    const row = await prisma.estoqueTelegramNotify.findUnique({
      where: { usuario_estoque_unique: { usuarioId, estoqueId } },
      select: { chatId: true },
    });
    const chatId = row?.chatId;
    if (!chatId) throw new Error('chatId não configurado para este usuário/estoque');

    return this.safeSendPlain(
      chatId,
      text ?? `✅ Teste de notificação do estoque #${estoqueId} para o usuário #${usuarioId}`
    );
  },

  upsertChatForUsuarioEstoque,
  upsertChatForEstoqueGlobal,

  async sendLowStockAlert(p: { estoqueId:number; itemId:number; itemNome:string; quantidade:number; minimo:number; }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';
    const dests = await getDestinatariosPorEstoque(p.estoqueId);
    if (!dests.length) return 'NO_DESTS';
    const falta = Math.max(0, p.minimo - p.quantidade);

    const html =
      `⚠️ <b>Abaixo do mínimo</b>\n` +
      `<b>Estoque:</b> #${p.estoqueId}\n` +
      `<b>Item:</b> ${escHtml(p.itemNome)} (ID ${p.itemId})\n` +
      `<b>Qtd:</b> ${p.quantidade}  |  <b>Mín:</b> ${p.minimo}` +
      (falta > 0 ? `\n<b>Faltando:</b> ${falta}` : '');

    return sendToMany(html, dests);
  },

  async sendRupturaAlert(p: { estoqueId:number; itemId:number; itemNome:string; quantidade:number; minimo:number; }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';
    const dests = await getDestinatariosPorEstoque(p.estoqueId);
    if (!dests.length) return 'NO_DESTS';

    const html =
      `🛑 <b>Ruptura de estoque</b>\n` +
      `<b>Estoque:</b> #${p.estoqueId}\n` +
      `<b>Item:</b> ${escHtml(p.itemNome)} (ID ${p.itemId})\n` +
      `<b>Qtd:</b> ${p.quantidade}  |  <b>Mín:</b> ${p.minimo}`;

    return sendToMany(html, dests);
  },

  async sendLowStockResolved(p: { estoqueId:number; itemId:number; itemNome:string; quantidade:number; minimo:number; }): Promise<TelegramResult> {
    if (!bot) return 'DISABLED';
    const dests = await getDestinatariosPorEstoque(p.estoqueId);
    if (!dests.length) return 'NO_DESTS';

    const html =
      `✅ <b>Estoque normalizado</b>\n` +
      `<b>Estoque:</b> #${p.estoqueId}\n` +
      `<b>Item:</b> ${escHtml(p.itemNome)} (ID ${p.itemId})\n` +
      `<b>Qtd:</b> ${p.quantidade}  |  <b>Mín:</b> ${p.minimo}`;

    return sendToMany(html, dests);
  },
};
