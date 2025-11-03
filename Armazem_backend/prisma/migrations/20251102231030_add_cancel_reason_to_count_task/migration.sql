-- CreateEnum
CREATE TYPE "public"."AbcClasses" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "public"."CountStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RECOUNT_REQUIRED', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."DiscrepancyResolution" AS ENUM ('WITHIN_TOLERANCE', 'ADJUSTED', 'RECOUNT_CLOSED');

-- AlterTable
ALTER TABLE "public"."estoque_itens" ADD COLUMN     "classeAbc" "public"."AbcClasses",
ADD COLUMN     "lastCountedAt" TIMESTAMP(3),
ADD COLUMN     "nextCountDueAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."contagem_politicas" (
    "id" SERIAL NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "itemId" INTEGER,
    "classeAbc" "public"."AbcClasses",
    "frequenciaDias" INTEGER NOT NULL,
    "toleranciaPct" DOUBLE PRECISION NOT NULL,
    "contagemDupla" BOOLEAN NOT NULL DEFAULT true,
    "bloquearMov" BOOLEAN NOT NULL DEFAULT true,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contagem_politicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contagem_tarefas" (
    "id" SERIAL NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "loteId" INTEGER,
    "serialId" INTEGER,
    "status" "public"."CountStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelReason" VARCHAR(255),
    "politicaId" INTEGER,
    "toleranciaPct" DOUBLE PRECISION,
    "contagemDupla" BOOLEAN,
    "bloquearMov" BOOLEAN,
    "systemQtyAtStart" INTEGER,
    "finalQty" INTEGER,
    "resolution" "public"."DiscrepancyResolution",
    "ajusteMovId" INTEGER,
    "createdById" INTEGER,
    "closedById" INTEGER,

    CONSTRAINT "contagem_tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contagem_lancamentos" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "tentativa" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "contadoPorId" INTEGER,
    "contadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contagem_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contagem_politicas_estoqueId_ativa_idx" ON "public"."contagem_politicas"("estoqueId", "ativa");

-- CreateIndex
CREATE INDEX "contagem_politicas_classeAbc_idx" ON "public"."contagem_politicas"("classeAbc");

-- CreateIndex
CREATE UNIQUE INDEX "contagem_politicas_estoqueId_itemId_classeAbc_key" ON "public"."contagem_politicas"("estoqueId", "itemId", "classeAbc");

-- CreateIndex
CREATE INDEX "contagem_tarefas_estoqueId_itemId_status_dueAt_idx" ON "public"."contagem_tarefas"("estoqueId", "itemId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "contagem_lancamentos_contadoEm_idx" ON "public"."contagem_lancamentos"("contadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "contagem_lancamentos_tarefaId_tentativa_key" ON "public"."contagem_lancamentos"("tarefaId", "tentativa");

-- AddForeignKey
ALTER TABLE "public"."contagem_politicas" ADD CONSTRAINT "contagem_politicas_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contagem_tarefas" ADD CONSTRAINT "contagem_tarefas_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contagem_tarefas" ADD CONSTRAINT "contagem_tarefas_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contagem_tarefas" ADD CONSTRAINT "contagem_tarefas_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contagem_tarefas" ADD CONSTRAINT "contagem_tarefas_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "public"."seriais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contagem_tarefas" ADD CONSTRAINT "contagem_tarefas_politicaId_fkey" FOREIGN KEY ("politicaId") REFERENCES "public"."contagem_politicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contagem_lancamentos" ADD CONSTRAINT "contagem_lancamentos_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "public"."contagem_tarefas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
