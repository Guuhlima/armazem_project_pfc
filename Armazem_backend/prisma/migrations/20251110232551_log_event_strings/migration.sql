/*
  Warnings:

  - The primary key for the `log_event` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `botChatId` on the `log_event` table. All the data in the column will be lost.
  - You are about to drop the column `botMessageId` on the `log_event` table. All the data in the column will be lost.
  - You are about to drop the column `correlationId` on the `log_event` table. All the data in the column will be lost.
  - You are about to drop the column `httpMethod` on the `log_event` table. All the data in the column will be lost.
  - You are about to drop the column `ip` on the `log_event` table. All the data in the column will be lost.
  - You are about to drop the column `transferenciaId` on the `log_event` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `log_event` table. All the data in the column will be lost.
  - The `actorUserId` column on the `log_event` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `log_event` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `action` on the `log_event` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `metadata` on table `log_event` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."log_event_actorUserId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."log_event_createdAt_idx";

-- DropIndex
DROP INDEX "public"."log_event_estoqueId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."log_event_itemId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."log_event_route_createdAt_idx";

-- DropIndex
DROP INDEX "public"."log_event_type_action_createdAt_idx";

-- AlterTable
ALTER TABLE "public"."log_event" DROP CONSTRAINT "log_event_pkey",
DROP COLUMN "botChatId",
DROP COLUMN "botMessageId",
DROP COLUMN "correlationId",
DROP COLUMN "httpMethod",
DROP COLUMN "ip",
DROP COLUMN "transferenciaId",
DROP COLUMN "userAgent",
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" TEXT NOT NULL,
ALTER COLUMN "success" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "actorUserId",
ADD COLUMN     "actorUserId" INTEGER,
ALTER COLUMN "metadata" SET NOT NULL,
ALTER COLUMN "metadata" SET DEFAULT '{}',
ADD CONSTRAINT "log_event_pkey" PRIMARY KEY ("id");
