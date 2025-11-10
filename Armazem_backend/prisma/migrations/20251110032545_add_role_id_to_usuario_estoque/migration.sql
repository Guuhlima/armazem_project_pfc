-- AlterTable
ALTER TABLE "public"."usuarios_estoques" ADD COLUMN     "roleId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."usuarios_estoques" ADD CONSTRAINT "usuarios_estoques_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."permissoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
