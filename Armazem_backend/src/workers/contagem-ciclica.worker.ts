import { gerarTarefasVencidas } from "../service/contagem-ciclica.service";

export async function startCyclicCountWorker() {
  await gerarTarefasVencidas();

  const ONE_DAY = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    console.log("[ContagemCiclica] Gerando tarefas vencidas...");
    try {
      const result = await gerarTarefasVencidas();
      console.log(`[ContagemCiclica] Criadas ${result.criadas ?? 0} tarefas`);
    } catch (err) {
      console.error("[ContagemCiclica] Erro ao gerar tarefas:", err);
    }
  }, ONE_DAY);
}