// src/service/telegram.service.ts
import dns from 'node:dns';
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';

dns.setDefaultResultOrder?.('ipv4first'); // força IPv4 no Node 18+

let bot: TelegramBot | null = null;

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escMd(s: string) {
  return s.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
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
  return rows.map(r => r.chatId);
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
    // NÃO usar "request: { family: 4 }" — tipos não aceitam; o dns acima já força IPv4
  });

  bot.on('polling_error', (err) => {
    console.warn('[telegram] polling_error:', (err as any)?.code || err?.toString?.());
  });
  bot.on('webhook_error', (err) => {
    console.warn('[telegram] webhook_error:', err?.toString?.());
  });

  bot.onText(/^\/chatid\b/i, async (msg) => {
    const chatId = String(msg.chat.id);
    await bot!.sendMessage(
      chatId,
      `✅ O chat_id deste chat é: <code>${escHtml(chatId)}</code>`,
      { parse_mode: 'HTML' }
    );
  });

  process.once('SIGINT', stopTelegram);
  process.once('SIGTERM', stopTelegram);

  console.log('[telegram] iniciado (polling)');
}

export async function stopTelegram() {
  if (!bot) return;
  try { await bot.stopPolling(); } catch {}
  bot = null;
  console.log('[telegram] parado');
}

export const TelegramService = {
  async safeSendRaw(chatId: string, text: string) {
    if (!bot) return;
    try {
      for (const part of chunk(text)) {
        await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
      }
    } catch (e: any) {
      const code = e?.response?.statusCode ?? e?.statusCode;
      const desc = e?.response?.body?.description ?? e?.message;
      console.error('Telegram sendMessage failed', { chatId, code, desc });

      if (code === 403 || String(desc || '').includes('bot was blocked by the user')) {
        await prisma.estoqueTelegramNotify.deleteMany({ where: { chatId } }).catch(() => {});
      }
    }
  },

  async sendTransferNotification(params: {
    estoqueOrigemId: number;
    estoqueDestinoId: number;
    itemNome: string;
    quantidade: number;
    usuario: string;
    transferenciaId: number;
    quando: Date;
  }) {
    if (!bot) return;

    const t = params;
    const dests = [
      ...await getDestinatariosPorEstoque(t.estoqueOrigemId),
      ...await getDestinatariosPorEstoque(t.estoqueDestinoId),
    ];
    if (!dests.length) return;

    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(t.quando);

    const text =
`📦 *Nova transferência de equipamento*
*Item:* ${escMd(t.itemNome)}
*Quantidade:* ${t.quantidade}
*De:* #${t.estoqueOrigemId} → *Para:* #${t.estoqueDestinoId}
*Por:* ${escMd(t.usuario)}
*ID:* ${t.transferenciaId}
*Quando:* ${escMd(quandoFmt)}`;

    await Promise.all(dests.map(id => this.safeSendRaw(id, text)));
  },

  async sendAccessRequestNotification(params: {
    estoqueId: number;
    solicitante: string;
    motivo?: string;
    solicitacaoId: number;
    quando: Date;
  }) {
    if (!bot) return;

    const s = params;
    const dests = await getDestinatariosPorEstoque(s.estoqueId);
    if (!dests.length) return;

    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(s.quando);

    const text =
`🔐 *Nova solicitação de acesso ao estoque #${s.estoqueId}*
*Solicitante:* ${escMd(s.solicitante)}
${s.motivo ? `*Motivo:* ${escMd(s.motivo)}\n` : ''}*ID:* ${s.solicitacaoId}
*Quando:* ${escMd(quandoFmt)}`;

    await Promise.all(dests.map(id => this.safeSendRaw(id, text)));
  },
};
