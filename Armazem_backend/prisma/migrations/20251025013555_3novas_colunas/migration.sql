-- CreateEnum
CREATE TYPE "public"."RastreioTipo" AS ENUM ('NONE', 'LOTE', 'SERIAL');

-- AlterTable
ALTER TABLE "public"."equipamentos" ADD COLUMN     "rastreioTipo" "public"."RastreioTipo" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "public"."lotes" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "validade" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."seriais" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "loteId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seriais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mov_estoque" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "loteId" INTEGER,
    "serialId" INTEGER,
    "estoqueOrigemId" INTEGER,
    "estoqueDestinoId" INTEGER,
    "quantidade" INTEGER NOT NULL,
    "tipoEvento" TEXT NOT NULL,
    "referenciaTabela" TEXT,
    "referenciaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mov_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lotes_itemId_validade_idx" ON "public"."lotes"("itemId", "validade");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_itemId_codigo_key" ON "public"."lotes"("itemId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "seriais_numero_key" ON "public"."seriais"("numero");

-- CreateIndex
CREATE INDEX "seriais_itemId_loteId_idx" ON "public"."seriais"("itemId", "loteId");

-- CreateIndex
CREATE INDEX "mov_estoque_itemId_loteId_serialId_idx" ON "public"."mov_estoque"("itemId", "loteId", "serialId");

-- CreateIndex
CREATE INDEX "mov_estoque_estoqueOrigemId_idx" ON "public"."mov_estoque"("estoqueOrigemId");

-- CreateIndex
CREATE INDEX "mov_estoque_estoqueDestinoId_idx" ON "public"."mov_estoque"("estoqueDestinoId");

-- AddForeignKey
ALTER TABLE "public"."lotes" ADD CONSTRAINT "lotes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seriais" ADD CONSTRAINT "seriais_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seriais" ADD CONSTRAINT "seriais_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mov_estoque" ADD CONSTRAINT "mov_estoque_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mov_estoque" ADD CONSTRAINT "mov_estoque_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mov_estoque" ADD CONSTRAINT "mov_estoque_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "public"."seriais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mov_estoque" ADD CONSTRAINT "mov_estoque_estoqueOrigemId_fkey" FOREIGN KEY ("estoqueOrigemId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mov_estoque" ADD CONSTRAINT "mov_estoque_estoqueDestinoId_fkey" FOREIGN KEY ("estoqueDestinoId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
