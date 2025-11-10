/*
  Warnings:

  - The values [INVETORY] on the enum `LogType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."LogType_new" AS ENUM ('ACCESS', 'INVENTORY', 'BOT');
ALTER TABLE "public"."log_event" ALTER COLUMN "type" TYPE "public"."LogType_new" USING ("type"::text::"public"."LogType_new");
ALTER TYPE "public"."LogType" RENAME TO "LogType_old";
ALTER TYPE "public"."LogType_new" RENAME TO "LogType";
DROP TYPE "public"."LogType_old";
COMMIT;
