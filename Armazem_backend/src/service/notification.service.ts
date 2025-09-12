// src/services/notification.service.ts
import { prisma } from '../lib/prisma';
import { TelegramService } from './telegram.service';

export const NotificationService = {
  // Notificação genérica (in-app)
  async notifyUserInApp(userId: number, data: {
    type: string;           // ex.: 'transfer', 'access_request'
    title: string;
    message?: string;
    refId?: number | null;  // ID de referência (transferência, solicitação, etc.)
  }) {
    return prisma.notificacao.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message ?? '',
        refId: data.refId ?? null,
      },
    });
  },

  // Notificar admins do estoque (in-app + telegram)
  async notifyEstoqueAdmins(estoqueId: number, payload: {
    type: string;
    title: string;
    message?: string;
    refId?: number | null;
    telegramText?: string;  // se presente, enviamos no Telegram
  }) {
    const adminUserIds = await resolveEstoqueAdmins(estoqueId);

    // 1) IN-APP
    if (adminUserIds.length) {
      await prisma.$transaction(
        adminUserIds.map((uid) =>
          prisma.notificacao.create({
            data: {
              userId: uid,
              type: payload.type,
              title: payload.title,
              message: payload.message ?? '',
              refId: payload.refId ?? null,
            },
          })
        )
      );
    }

    // 2) TELEGRAM
    if (payload.telegramText) {
      try {
        const chatIds = await getEstoqueChatIds(estoqueId);
        if (chatIds.length) {
          await Promise.all(
            chatIds.map((chatId) =>
              TelegramService.safeSendRaw(chatId, payload.telegramText!)
            )
          );
        }
      } catch (err) {
        console.error('Telegram send error', err);
      }
    }
  },

  // Caso específico: transferência
  async notifyTransferencia(params: {
    estoqueOrigemId: number;
    estoqueDestinoId: number;
    itemNome: string;
    quantidade: number;
    usuario: string;
    transferenciaId: number;
    quando: Date;
  }) {
    const t = params;
    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
    }).format(t.quando);

    const telegramText =
      `📦 *Nova transferência de equipamento*
      *Item:* ${t.itemNome}
      *Quantidade:* ${t.quantidade}
      *De:* #${t.estoqueOrigemId} → *Para:* #${t.estoqueDestinoId}
      *Por:* ${t.usuario}
      *ID:* ${t.transferenciaId}
      *Quando:* ${quandoFmt}
      `;

    await Promise.all([
      // Aviso para admins do estoque de origem
      this.notifyEstoqueAdmins(t.estoqueOrigemId, {
        type: 'transfer',
        title: 'Nova transferência enviada',
        message: `${t.quantidade}× ${t.itemNome} para estoque #${t.estoqueDestinoId} por ${t.usuario} em ${quandoFmt}`,
        refId: t.transferenciaId,
        telegramText,
      }),
      // Aviso para admins do estoque de destino
      this.notifyEstoqueAdmins(t.estoqueDestinoId, {
        type: 'transfer',
        title: 'Nova transferência recebida',
        message: `${t.quantidade}× ${t.itemNome} de estoque #${t.estoqueOrigemId} por ${t.usuario} em ${quandoFmt}`,
        refId: t.transferenciaId,
        telegramText,
      }),
    ]);
  },

  // Caso específico: solicitação de acesso
  async notifySolicitacaoAcesso(params: {
    estoqueId: number;
    solicitante: string;
    motivo?: string;
    solicitacaoId: number;
    quando: Date;
  }) {
    const s = params;
    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
    }).format(s.quando);

    const message =
      `${s.solicitante} solicitou acesso ao estoque #${s.estoqueId} em ${quandoFmt}` +
      (s.motivo ? ` (motivo: ${s.motivo})` : '');

    const telegramText =
`🔐 *Nova solicitação de acesso ao estoque #${s.estoqueId}*
*Solicitante:* ${s.solicitante}
${s.motivo ? `*Motivo:* ${s.motivo}\n` : ''}*ID:* ${s.solicitacaoId}
*Quando:* ${quandoFmt}
`;

    await this.notifyEstoqueAdmins(s.estoqueId, {
      type: 'access_request',
      title: 'Solicitação de acesso ao estoque',
      message,
      refId: s.solicitacaoId,
      telegramText,
    });
  },
};

// ===== Helpers =====

// Admins do estoque: pega usuários com role ADMIN na tabela de junção
async function resolveEstoqueAdmins(estoqueId: number): Promise<number[]> {
  const admins = await prisma.usuarioEstoque.findMany({
    where: {
      estoqueId,
      role: 'ADMIN', // StockRole.ADMIN
    },
    select: { usuarioId: true },
  });
  return admins.map(a => a.usuarioId);
}

// Chat IDs configurados para o estoque
async function getEstoqueChatIds(estoqueId: number): Promise<string[]> {
  const rows = await prisma.estoqueTelegramNotify.findMany({
    where: { estoqueId },
    select: { chatId: true },
  });
  return rows.map(r => r.chatId);
}
