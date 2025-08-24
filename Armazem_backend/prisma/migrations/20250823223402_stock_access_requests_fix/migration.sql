-- CreateEnum
CREATE TYPE "public"."StockRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."AccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."usuarios_estoques" ADD COLUMN     "role" "public"."StockRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "public"."StockAccessRequest" (
    "id" SERIAL NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "status" "public"."AccessStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(255),
    "approverId" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockAccessRequest_estoqueId_usuarioId_status_key" ON "public"."StockAccessRequest"("estoqueId", "usuarioId", "status");

-- AddForeignKey
ALTER TABLE "public"."StockAccessRequest" ADD CONSTRAINT "StockAccessRequest_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAccessRequest" ADD CONSTRAINT "StockAccessRequest_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAccessRequest" ADD CONSTRAINT "StockAccessRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
