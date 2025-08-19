/*
  Warnings:

  - You are about to drop the column `usedat` on the `PasswordResetToken` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."PasswordResetToken" DROP COLUMN "usedat",
ADD COLUMN     "usedAt" TIMESTAMP(3);
