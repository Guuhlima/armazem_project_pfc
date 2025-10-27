/*
  Warnings:

  - You are about to drop the column `matricula` on the `usuarios` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AlertaTipo" AS ENUM ('ABAIXO_MINIMO', 'RUPTURA', 'EXCESSO');

-- AlterTable
ALTER TABLE "public"."estoque_itens" ADD COLUMN     "alertaativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimo" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "quantidade" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."usuarios" DROP COLUMN "matricula";

-- CreateTable
CREATE TABLE "public"."Ciente_cookies" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ciencia" BOOLEAN NOT NULL,

    CONSTRAINT "Ciente_cookies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alertas_estoque" (
    "id" SERIAL NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "tipo" "public"."AlertaTipo" NOT NULL,
    "mensagem" TEXT NOT NULL,
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "ultimoEnvioAt" TIMESTAMP(3),

    CONSTRAINT "alertas_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MovimentacaoEstoque" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "referenciaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alertas_estoque_estoqueId_itemId_resolvido_idx" ON "public"."alertas_estoque"("estoqueId", "itemId", "resolvido");

-- AddForeignKey
ALTER TABLE "public"."Ciente_cookies" ADD CONSTRAINT "Ciente_cookies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alertas_estoque" ADD CONSTRAINT "alertas_estoque_itemId_estoqueId_fkey" FOREIGN KEY ("itemId", "estoqueId") REFERENCES "public"."estoque_itens"("itemId", "estoqueId") ON DELETE RESTRICT ON UPDATE CASCADE;
