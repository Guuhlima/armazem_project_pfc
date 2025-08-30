-- CreateTable
CREATE TABLE "public"."EstoqueTelegramNotify" (
    "id" SERIAL NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueTelegramNotify_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueTelegramNotify_estoqueId_key" ON "public"."EstoqueTelegramNotify"("estoqueId");

-- AddForeignKey
ALTER TABLE "public"."EstoqueTelegramNotify" ADD CONSTRAINT "EstoqueTelegramNotify_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
