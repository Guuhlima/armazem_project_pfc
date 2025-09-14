-- CreateEnum
CREATE TYPE "public"."AgendamentoStatus" AS ENUM ('PENDING', 'SENT', 'EXECUTED', 'CANCELED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."transferencias" ALTER COLUMN "dataTransferencia" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "public"."transferencias_agendadas" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "estoqueOrigemId" INTEGER NOT NULL,
    "estoqueDestinoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "executarEm" TIMESTAMPTZ(6) NOT NULL,
    "status" "public"."AgendamentoStatus" NOT NULL DEFAULT 'PENDING',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erroUltimaTentativa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transferenciaId" INTEGER,

    CONSTRAINT "transferencias_agendadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transferencias_agendadas_transferenciaId_key" ON "public"."transferencias_agendadas"("transferenciaId");

-- CreateIndex
CREATE INDEX "transferencias_agendadas_status_executarEm_idx" ON "public"."transferencias_agendadas"("status", "executarEm");

-- CreateIndex
CREATE INDEX "transferencias_agendadas_usuarioId_idx" ON "public"."transferencias_agendadas"("usuarioId");

-- CreateIndex
CREATE INDEX "transferencias_agendadas_itemId_estoqueOrigemId_estoqueDest_idx" ON "public"."transferencias_agendadas"("itemId", "estoqueOrigemId", "estoqueDestinoId");

-- AddForeignKey
ALTER TABLE "public"."transferencias_agendadas" ADD CONSTRAINT "transferencias_agendadas_transferenciaId_fkey" FOREIGN KEY ("transferenciaId") REFERENCES "public"."transferencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transferencias_agendadas" ADD CONSTRAINT "transferencias_agendadas_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transferencias_agendadas" ADD CONSTRAINT "transferencias_agendadas_estoqueOrigemId_fkey" FOREIGN KEY ("estoqueOrigemId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transferencias_agendadas" ADD CONSTRAINT "transferencias_agendadas_estoqueDestinoId_fkey" FOREIGN KEY ("estoqueDestinoId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transferencias_agendadas" ADD CONSTRAINT "transferencias_agendadas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
