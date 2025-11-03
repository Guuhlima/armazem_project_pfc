import { prisma } from '../lib/prisma';
import { getChannel } from '../queue/rabbit';
import { gerarTarefasVencidas } from '../service/contagem-ciclica.service';

const TICK_MS = 60_000;

// RABBITMQ PARA TRANSFERENCIAS
export async function schedulerTick() {
  const now = new Date();
  const janela = new Date(now.getTime() + TICK_MS);

  const pendentes = await prisma.transferenciaAgendada.findMany({
    where: { status: 'PENDING', executarEm: { lte: janela } },
    orderBy: { executarEm: 'asc' },
    take: 100,
  });
  if (!pendentes.length) return;

  const ch = await getChannel();

  for (const j of pendentes) {
    await prisma.transferenciaAgendada.update({
      where: { id: j.id },
      data: { status: 'SENT' },
    });

    const payload = {
      jobId: j.id,
      itemId: j.itemId,
      estoqueOrigemId: j.estoqueOrigemId,
      estoqueDestinoId: j.estoqueDestinoId,
      quantidade: j.quantidade,
      usuarioId: j.usuarioId,
    };

    ch.sendToQueue('transfer.execute', Buffer.from(JSON.stringify(payload)), {
      contentType: 'application/json',
      deliveryMode: 2,
      messageId: `ag-${j.id}`,
    });
  }
}

// AGENDAMENTO PARA O CONTAGEM CICLICA
function nextOccurrence(hour = 2, minute = 0) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/** agenda para rodar todo dia em (hour:minute) e executa imediatamente uma vez */
function startCyclicCountDaily(hour = Number(process.env.COUNT_DAILY_HOUR ?? 2), minute = 0) {
  // 1) roda AGORA
  (async () => {
    try {
      console.log('[ContagemCiclica] Execução inicial imediata…');
      const out = await gerarTarefasVencidas();
      console.log(`[ContagemCiclica] Inicial: criadas ${out?.criadas ?? 0}`);
    } catch (err) {
      console.error('[ContagemCiclica] Erro na execução inicial:', err);
    }
  })();

  // 2) calcula o primeiro disparo
  const first = nextOccurrence(hour, minute);
  const msUntilFirst = first.getTime() - Date.now();

  console.log(
    `[ContagemCiclica] Próxima execução diária em ${first.toLocaleString()} (em ${(msUntilFirst/1000/60).toFixed(1)} min)`
  );

  // 3) agenda o primeiro disparo; depois roda a cada 24h
  setTimeout(() => {
    const run = async () => {
      try {
        console.log('[ContagemCiclica] Execução diária…');
        const out = await gerarTarefasVencidas();
        console.log(`[ContagemCiclica] Diária: criadas ${out?.criadas ?? 0}`);
      } catch (err) {
        console.error('[ContagemCiclica] Erro na execução diária:', err);
      }
    };

    // dispara agora e configura intervalo de 24h
    run();
    setInterval(run, 24 * 60 * 60 * 1000);
  }, msUntilFirst);
}

export function startSchedulerLoop() {
  setInterval(() => {
    schedulerTick().catch((e) => console.error('schedulerTick error:', e));
  }, TICK_MS);

  startCyclicCountDaily();
}
