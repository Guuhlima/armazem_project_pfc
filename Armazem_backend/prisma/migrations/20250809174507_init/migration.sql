-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255),
    "email" VARCHAR(255),
    "matricula" INTEGER,
    "senha" VARCHAR(255),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."estoques" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,

    CONSTRAINT "estoques_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."estoque_itens" (
    "id" SERIAL NOT NULL,
    "estoqueId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "estoque_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissoes" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios_permissoes" (
    "usuarioId" INTEGER NOT NULL,
    "permissaoId" INTEGER NOT NULL,

    CONSTRAINT "usuarios_permissoes_pkey" PRIMARY KEY ("usuarioId","permissaoId")
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
CREATE TABLE "public"."PermissaoOnRoute" (
    "id" SERIAL NOT NULL,
    "permissaoId" INTEGER NOT NULL,
    "routeId" INTEGER NOT NULL,

    CONSTRAINT "PermissaoOnRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_itens_itemId_estoqueId_key" ON "public"."estoque_itens"("itemId", "estoqueId");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_nome_key" ON "public"."permissoes"("nome");

-- AddForeignKey
ALTER TABLE "public"."transferencias" ADD CONSTRAINT "transferencias_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."transferencias" ADD CONSTRAINT "transferencias_estoqueOrigemId_fkey" FOREIGN KEY ("estoqueOrigemId") REFERENCES "public"."estoques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."transferencias" ADD CONSTRAINT "transferencias_estoqueDestinoId_fkey" FOREIGN KEY ("estoqueDestinoId") REFERENCES "public"."estoques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."estoque_itens" ADD CONSTRAINT "estoque_itens_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "public"."estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estoque_itens" ADD CONSTRAINT "estoque_itens_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuarios_permissoes" ADD CONSTRAINT "usuarios_permissoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuarios_permissoes" ADD CONSTRAINT "usuarios_permissoes_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "public"."permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissaoOnRoute" ADD CONSTRAINT "PermissaoOnRoute_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "public"."permissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissaoOnRoute" ADD CONSTRAINT "PermissaoOnRoute_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
