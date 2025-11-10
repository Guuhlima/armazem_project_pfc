-- CreateEnum
CREATE TYPE "public"."LogType" AS ENUM ('ACCESS', 'INVETORY', 'BOT');

-- CreateEnum
CREATE TYPE "public"."LogAction" AS ENUM ('LOGIN', 'LOGOUT', 'REQUEST', 'CREATE', 'UPDATE', 'DELETE', 'MOVE', 'TRANSFER', 'MESSAGE_SENT', 'MESSAGE_FAILED');

-- CreateTable
CREATE TABLE "public"."log_event" (
    "id" UUID NOT NULL,
    "type" "public"."LogType" NOT NULL,
    "action" "public"."LogAction" NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" UUID,
    "actorName" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "httpMethod" TEXT,
    "route" TEXT,
    "correlationId" TEXT,
    "message" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "itemId" INTEGER,
    "estoqueId" INTEGER,
    "transferenciaId" INTEGER,
    "botMessageId" TEXT,
    "botChatId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "log_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "log_event_type_action_createdAt_idx" ON "public"."log_event"("type", "action", "createdAt");

-- CreateIndex
CREATE INDEX "log_event_createdAt_idx" ON "public"."log_event"("createdAt");

-- CreateIndex
CREATE INDEX "log_event_actorUserId_createdAt_idx" ON "public"."log_event"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "log_event_itemId_createdAt_idx" ON "public"."log_event"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "log_event_estoqueId_createdAt_idx" ON "public"."log_event"("estoqueId", "createdAt");

-- CreateIndex
CREATE INDEX "log_event_route_createdAt_idx" ON "public"."log_event"("route", "createdAt");
