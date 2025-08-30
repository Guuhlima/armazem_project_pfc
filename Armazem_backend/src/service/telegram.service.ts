// src/services/telegram.service.ts
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';

const token = process.env.TELEGRAM_BOT_TOKEN!;
export const bot = new TelegramBot(token, { polling: true });

// Apenas informa o chat_id
bot.onText(/^\/chatid$/, async (msg) => {
  const chatId = String(msg.chat.id);
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  await bot.sendMessage(
    chatId,
    `✅ O chat_id deste chat é: <code>${esc(chatId)}</code>`,
    { parse_mode: 'HTML' }
  );
});

// ===== Helpers internos =====
// busca todos os chatIds dos usuários que OPTARAM por receber no estoque X
async function getDestinatariosPorEstoque(estoqueId: number): Promise<string[]> {
  const rows = await prisma.estoqueTelegramNotify.findMany({
    where: { estoqueId },
    select: { chatId: true },
  });
  return rows.map(r => r.chatId);
}

export const TelegramService = {
  async safeSendRaw(chatId: string, text: string) {
    try {
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e: any) {
      const code = e?.response?.statusCode ?? e?.statusCode;
      const desc  = e?.response?.body?.description ?? e?.message;
      console.error('Telegram sendMessage failed', { chatId, code, desc });

      // se o usuário bloqueou o bot, limpamos esse chatId do banco
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
    const t = params;
    const dests = [
      ...await getDestinatariosPorEstoque(t.estoqueOrigemId),
      ...await getDestinatariosPorEstoque(t.estoqueDestinoId),
    ];
    if (!dests.length) return;

    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle:'short', timeStyle:'short', timeZone:'America/Sao_Paulo'
    }).format(t.quando);

    const text =
`📦 *Nova transferência de equipamento*
*Item:* ${t.itemNome}
*Quantidade:* ${t.quantidade}
*De:* #${t.estoqueOrigemId} → *Para:* #${t.estoqueDestinoId}
*Por:* ${t.usuario}
*ID:* ${t.transferenciaId}
*Quando:* ${quandoFmt}
`;
    await Promise.all(dests.map(id => this.safeSendRaw(id, text)));
  },

  async sendAccessRequestNotification(params: {
    estoqueId: number;
    solicitante: string;
    motivo?: string;
    solicitacaoId: number;
    quando: Date;
  }) {
    const s = params;
    const dests = await getDestinatariosPorEstoque(s.estoqueId);
    if (!dests.length) return;

    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle:'short', timeStyle:'short', timeZone:'America/Sao_Paulo'
    }).format(s.quando);

    const text =
`🔐 *Nova solicitação de acesso ao estoque #${s.estoqueId}*
*Solicitante:* ${s.solicitante}
${s.motivo ? `*Motivo:* ${s.motivo}\n` : ''}*ID:* ${s.solicitacaoId}
*Quando:* ${quandoFmt}
`;
    await Promise.all(dests.map(id => this.safeSendRaw(id, text)));
  },
};
