-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."StockRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "public"."EstoqueTelegramNotify" (
    "id" SERIAL NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" INTEGER,

    CONSTRAINT "EstoqueTelegramNotify_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notificacao" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "refId" INTEGER,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PermissaoOnRoute" (
    "id" SERIAL NOT NULL,
    "permissaoId" INTEGER NOT NULL,
    "routeId" INTEGER NOT NULL,

    CONSTRAINT "PermissaoOnRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Route" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."equipamentos" (
    "id" SERIAL NOT NULL,
    "equipamento" VARCHAR(255),
    "quantidade" INTEGER,
    "data" DATE,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."estoque_itens" (
    "id" SERIAL NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "estoque_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."estoques" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,

    CONSTRAINT "estoques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenHash" TEXT NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "desc" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissoes" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles_permissions" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "roles_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "public"."transferencias" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "estoqueOrigemId" INTEGER NOT NULL,
    "estoqueDestinoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "dataTransferencia" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "matricula" INTEGER,
    "senha" VARCHAR(255),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios_estoques" (
    "usuarioId" INTEGER NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "role" "public"."StockRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "usuarios_estoques_pkey" PRIMARY KEY ("usuarioId","estoqueId")
);

-- CreateTable
CREATE TABLE "public"."usuarios_permissoes" (
    "usuarioId" INTEGER NOT NULL,
    "permissaoId" INTEGER NOT NULL,

    CONSTRAINT "usuarios_permissoes_pkey" PRIMARY KEY ("usuarioId","permissaoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueTelegramNotify_estoqueId_key" ON "public"."EstoqueTelegramNotify"("estoqueId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StockAccessRequest_estoqueId_usuarioId_status_key" ON "public"."StockAccessRequest"("estoqueId" ASC, "usuarioId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "estoque_itens_itemId_estoqueId_key" ON "public"."estoque_itens"("itemId" ASC, "estoqueId" ASC);

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "public"."password_reset_tokens"("expiresAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "public"."password_reset_tokens"("tokenHash" ASC);

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "public"."password_reset_tokens"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "public"."permissions"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_nome_key" ON "public"."permissoes"("nome" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."EstoqueTelegramNotify" ADD CONSTRAINT "EstoqueTelegramNotify_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstoqueTelegramNotify" ADD CONSTRAINT "EstoqueTelegramNotify_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notificacao" ADD CONSTRAINT "Notificacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissaoOnRoute" ADD CONSTRAINT "PermissaoOnRoute_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "public"."permissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissaoOnRoute" ADD CONSTRAINT "PermissaoOnRoute_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAccessRequest" ADD CONSTRAINT "StockAccessRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAccessRequest" ADD CONSTRAINT "StockAccessRequest_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAccessRequest" ADD CONSTRAINT "StockAccessRequest_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estoque_itens" ADD CONSTRAINT "estoque_itens_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estoque_itens" ADD CONSTRAINT "estoque_itens_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."roles_permissions" ADD CONSTRAINT "roles_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."roles_permissions" ADD CONSTRAINT "roles_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transferencias" ADD CONSTRAINT "transferencias_estoqueDestinoId_fkey" FOREIGN KEY ("estoqueDestinoId") REFERENCES "public"."estoques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."transferencias" ADD CONSTRAINT "transferencias_estoqueOrigemId_fkey" FOREIGN KEY ("estoqueOrigemId") REFERENCES "public"."estoques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."transferencias" ADD CONSTRAINT "transferencias_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."usuarios_estoques" ADD CONSTRAINT "usuarios_estoques_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuarios_estoques" ADD CONSTRAINT "usuarios_estoques_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuarios_permissoes" ADD CONSTRAINT "usuarios_permissoes_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "public"."permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuarios_permissoes" ADD CONSTRAINT "usuarios_permissoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

