/*
  Warnings:

  - You are about to drop the column `token` on the `password_reset_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `password_reset_tokens` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenHash]` on the table `password_reset_tokens` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenHash` to the `password_reset_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."password_reset_tokens_token_key";

-- AlterTable
ALTER TABLE "public"."password_reset_tokens" DROP COLUMN "token",
DROP COLUMN "type",
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "public"."password_reset_tokens"("tokenHash");
