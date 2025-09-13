-- AlterTable
ALTER TABLE "public"."transferencias" ADD COLUMN     "usuarioId" INTEGER;

-- CreateIndex
CREATE INDEX "transferencias_usuarioId_idx" ON "public"."transferencias"("usuarioId");

-- AddForeignKey
ALTER TABLE "public"."transferencias" ADD CONSTRAINT "transferencias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
