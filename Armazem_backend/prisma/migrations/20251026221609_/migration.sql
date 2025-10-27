/*
  Warnings:

  - A unique constraint covering the columns `[dedupKey]` on the table `transferencias_agendadas` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."estoque_itens" ADD COLUMN     "autoAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leadTimeDias" INTEGER,
ADD COLUMN     "maximo" INTEGER,
ADD COLUMN     "multiplo" INTEGER,
ADD COLUMN     "origemPreferidaId" INTEGER;

-- AlterTable
ALTER TABLE "public"."transferencias_agendadas" ADD COLUMN     "dedupKey" TEXT,
ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "origemTipo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transferencias_agendadas_dedupKey_key" ON "public"."transferencias_agendadas"("dedupKey");
