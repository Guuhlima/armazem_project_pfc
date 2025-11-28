import { prisma } from '../lib/prisma';
import { TelegramService } from './telegram.service';

// Service de notificao
export const NotificationService = {
  async notifyUserInApp(userId: number, data: {
    type: string;
    title: string;
    message?: string;
    refId?: number | null;
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
    telegramText?: string;
  }) {
    const adminUserIds = await resolveEstoqueAdmins(estoqueId);

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
      this.notifyEstoqueAdmins(t.estoqueOrigemId, {
        type: 'transfer',
        title: 'Nova transferência enviada',
        message: `${t.quantidade}× ${t.itemNome} para estoque #${t.estoqueDestinoId} por ${t.usuario} em ${quandoFmt}`,
        refId: t.transferenciaId,
        telegramText,
      }),

      this.notifyEstoqueAdmins(t.estoqueDestinoId, {
        type: 'transfer',
        title: 'Nova transferência recebida',
        message: `${t.quantidade}× ${t.itemNome} de estoque #${t.estoqueOrigemId} por ${t.usuario} em ${quandoFmt}`,
        refId: t.transferenciaId,
        telegramText,
      }),
    ]);
  },

  async notifySolicitacaoAcesso(params: {
    estoqueId: number;
    solicitante: string;
    motivo?: string;
    solicitacaoId: number;
    quando: Date;
  }) {
    const s = params;
    const quandoFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(s.quando);

    const message =
      `${s.solicitante} solicitou acesso ao estoque #${s.estoqueId} em ${quandoFmt}` +
      (s.motivo ? ` (motivo: ${s.motivo})` : '');

    await this.notifyEstoqueAdmins(s.estoqueId, {
      type: 'access_request',
      title: 'Solicitação de acesso ao estoque',
      message,
      refId: s.solicitacaoId,
    });

    const telegram = await TelegramService.sendAccessRequestNotification({
      estoqueId: s.estoqueId,
      solicitante: s.solicitante,
      motivo: s.motivo,
      solicitacaoId: s.solicitacaoId,
      quando: s.quando,
    });

    console.log('[notifySolicitacaoAcesso] telegram result =', telegram);
  },
};

async function resolveEstoqueAdmins(estoqueId: number): Promise<number[]> {
  const admins = await prisma.usuarioEstoque.findMany({
    where: {
      estoqueId,
      role: 'ADMIN',
    },
    select: { usuarioId: true },
  });
  return admins.map(a => a.usuarioId);
}

async function getEstoqueChatIds(estoqueId: number): Promise<string[]> {
  const rows = await prisma.estoqueTelegramNotify.findMany({
    where: { estoqueId },
    select: { chatId: true },
  });
  return rows.map(r => r.chatId);
}
