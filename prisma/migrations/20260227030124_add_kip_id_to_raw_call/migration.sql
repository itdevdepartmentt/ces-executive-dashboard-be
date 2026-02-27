/*
  Warnings:

  - A unique constraint covering the columns `[kip_id]` on the table `RawCall` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `kip_id` to the `RawCall` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RawCall_update_stamp_msisdn_key";

-- AlterTable
ALTER TABLE "RawCall" ADD COLUMN     "kip_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RawCall_kip_id_key" ON "RawCall"("kip_id");
