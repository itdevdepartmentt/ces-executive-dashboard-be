/*
  Warnings:

  - You are about to drop the column `approval billco` on the `RawOmnix` table. All the data in the column will be lost.
  - You are about to drop the column `date_eskalasi` on the `RawOmnix` table. All the data in the column will be lost.
  - You are about to drop the column `date_eskalasi ebo` on the `RawOmnix` table. All the data in the column will be lost.
  - You are about to drop the column `date_eskalasi it` on the `RawOmnix` table. All the data in the column will be lost.
  - You are about to drop the column `date_eskalasi no` on the `RawOmnix` table. All the data in the column will be lost.
  - You are about to drop the column `date_menunggu` on the `RawOmnix` table. All the data in the column will be lost.
  - You are about to drop the column `partner` on the `RawOmnix` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RawOmnix" DROP COLUMN "approval billco",
DROP COLUMN "date_eskalasi",
DROP COLUMN "date_eskalasi ebo",
DROP COLUMN "date_eskalasi it",
DROP COLUMN "date_eskalasi no",
DROP COLUMN "date_menunggu",
DROP COLUMN "partner",
ADD COLUMN     "date_eskalasi_ebo" TIMESTAMP(3),
ADD COLUMN     "date_eskalasi_it" TIMESTAMP(3),
ADD COLUMN     "date_eskalasi_no" TIMESTAMP(3),
ADD COLUMN     "date_eskalasi_partner" TIMESTAMP(3),
ADD COLUMN     "date_menunggu_approval_billco" TIMESTAMP(3);
