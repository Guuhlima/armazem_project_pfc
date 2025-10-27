// tests/controllersTests/stockAlerts.telegram.e2e.test.ts
import '../env-setup';
import { prisma } from 'lib/prisma';
import { checarLimitesEGerenciarAlertas } from 'service/estoque-alertas.service';
import { startTelegram, stopTelegram, TelegramService } from 'service/telegram.service';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NET_PAUSE_MS = process.env.CI ? 800 : 300;

const ESTOQUE_ID = 91001;
const ITEM_ID = 92001;
const CHAT_ID = '5911849845'; // chat de testes

async function seed(
  estoqueId: number,
  itemId: number,
  opts?: { quantidade?: number; minimo?: number; alertaativo?: boolean; nome?: string }
) {
  // garante o estoque (FK de estoqueTelegramNotify depende disso)
  await prisma.estoque.upsert({
    where: { id: estoqueId },
    update: {},
    create: { id: estoqueId, nome: 'Estoque Teste' },
  });

  await prisma.equipamento.upsert({
    where: { id: itemId },
    update: { nome: opts?.nome ?? 'Item Teste' },
    create: { id: itemId, nome: opts?.nome ?? 'Item Teste' },
  });

  await prisma.alertaEstoque.deleteMany({ where: { estoqueId, itemId } });

  await prisma.estoqueItem.upsert({
    where: { itemId_estoqueId: { itemId, estoqueId } },
    update: {
      quantidade: opts?.quantidade ?? 6,
      minimo: opts?.minimo ?? 5,
      alertaativo: opts?.alertaativo ?? false,
    },
    create: {
      estoqueId,
      itemId,
      quantidade: opts?.quantidade ?? 6,
      minimo: opts?.minimo ?? 5,
      alertaativo: opts?.alertaativo ?? false,
    },
  });
}

beforeAll(async () => {
  process.env.TELEGRAM_ENABLED = 'true';
  process.env.TELEGRAM_THROTTLE_MINUTES = '0'; // sem throttle nos testes
  // TELEGRAM_BOT_TOKEN deve estar no ambiente (.env.test/CI)
  await startTelegram();
});

beforeEach(async () => {
  // limpa em ordem segura
  await prisma.alertaEstoque.deleteMany();
  await prisma.estoqueItem.deleteMany();
  await prisma.estoqueTelegramNotify.deleteMany({ where: { estoqueId: ESTOQUE_ID } });

  // ✅ garante o ESTOQUE antes de vincular o chat (evita FK)
  await prisma.estoque.upsert({
    where: { id: ESTOQUE_ID },
    update: {},
    create: { id: ESTOQUE_ID, nome: 'Estoque Teste' },
  });

  // vincula chat global para o estoque de teste
  await TelegramService.upsertChatForEstoqueGlobal(ESTOQUE_ID, CHAT_ID);
});

afterAll(async () => {
  await stopTelegram();
  await prisma.$disconnect();
});

describe('Alertas de estoque (com Telegram real)', () => {
  it('abaixo do mínimo → cria alerta + envia notificação', async () => {
    await seed(ESTOQUE_ID, ITEM_ID, { quantidade: 6, minimo: 5, nome: 'Notebook QA' });

    // 6 -> 4 (abaixo)
    await prisma.estoqueItem.update({
      where: { itemId_estoqueId: { itemId: ITEM_ID, estoqueId: ESTOQUE_ID } },
      data: { quantidade: { decrement: 2 } },
    });

    await checarLimitesEGerenciarAlertas(ESTOQUE_ID, ITEM_ID);
    await sleep(NET_PAUSE_MS); // tempo pro queueMicrotask + HTTP

    // valida DB
    const ei = await prisma.estoqueItem.findUnique({
      where: { itemId_estoqueId: { itemId: ITEM_ID, estoqueId: ESTOQUE_ID } },
    });
    expect(ei?.quantidade).toBe(4);
    expect(ei?.alertaativo).toBe(true);

    const alerta = await prisma.alertaEstoque.findFirst({
      where: { estoqueId: ESTOQUE_ID, itemId: ITEM_ID, resolvido: false, tipo: 'ABAIXO_MINIMO' },
    });
    expect(alerta).toBeTruthy();
    expect(alerta?.ultimoEnvioAt).toBeTruthy(); // sinal de envio
  });

  it('normalizou → resolve alerta + envia notificação de normalização', async () => {
    // começa abaixo do mínimo (abre alerta)
    await seed(ESTOQUE_ID, ITEM_ID, { quantidade: 4, minimo: 5, nome: 'Mouse QA' });
    await checarLimitesEGerenciarAlertas(ESTOQUE_ID, ITEM_ID);
    await sleep(NET_PAUSE_MS);

    // sobe 3 → 7 (normal)
    await prisma.estoqueItem.update({
      where: { itemId_estoqueId: { itemId: ITEM_ID, estoqueId: ESTOQUE_ID } },
      data: { quantidade: { increment: 3 } },
    });

    await checarLimitesEGerenciarAlertas(ESTOQUE_ID, ITEM_ID);
    await sleep(NET_PAUSE_MS);

    const ei = await prisma.estoqueItem.findUnique({
      where: { itemId_estoqueId: { itemId: ITEM_ID, estoqueId: ESTOQUE_ID } },
    });
    expect(ei?.quantidade).toBe(7);
    expect(ei?.alertaativo).toBe(false);

    const abertos = await prisma.alertaEstoque.findMany({
      where: { estoqueId: ESTOQUE_ID, itemId: ITEM_ID, resolvido: false },
    });
    expect(abertos.length).toBe(0);

    const fechados = await prisma.alertaEstoque.findMany({
      where: { estoqueId: ESTOQUE_ID, itemId: ITEM_ID, resolvido: true },
    });
    expect(fechados.some((a) => a.resolvedAt != null)).toBe(true);
  });

  it('ruptura (0) → cria alerta RUPTURA + envia notificação', async () => {
    await seed(ESTOQUE_ID, ITEM_ID, { quantidade: 1, minimo: 5, nome: 'Cabo QA' });

    await prisma.estoqueItem.update({
      where: { itemId_estoqueId: { itemId: ITEM_ID, estoqueId: ESTOQUE_ID } },
      data: { quantidade: 0 },
    });

    await checarLimitesEGerenciarAlertas(ESTOQUE_ID, ITEM_ID);
    await sleep(NET_PAUSE_MS);

    const ruptura = await prisma.alertaEstoque.findFirst({
      where: { estoqueId: ESTOQUE_ID, itemId: ITEM_ID, resolvido: false, tipo: 'RUPTURA' },
    });
    expect(ruptura).toBeTruthy();
    expect(ruptura?.ultimoEnvioAt).toBeTruthy(); // sinal de envio
  });
});
