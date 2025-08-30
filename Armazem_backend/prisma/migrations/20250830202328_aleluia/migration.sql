/*
  Warnings:

  - A unique constraint covering the columns `[usuarioId,estoqueId]` on the table `EstoqueTelegramNotify` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."EstoqueTelegramNotify" DROP CONSTRAINT "EstoqueTelegramNotify_estoqueId_fkey";

-- DropIndex
DROP INDEX "public"."EstoqueTelegramNotify_estoqueId_key";

-- CreateIndex
CREATE INDEX "EstoqueTelegramNotify_estoqueId_idx" ON "public"."EstoqueTelegramNotify"("estoqueId");

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueTelegramNotify_usuarioId_estoqueId_key" ON "public"."EstoqueTelegramNotify"("usuarioId", "estoqueId");

-- AddForeignKey
ALTER TABLE "public"."EstoqueTelegramNotify" ADD CONSTRAINT "EstoqueTelegramNotify_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE CASCADE ON UPDATE CASCADE;
