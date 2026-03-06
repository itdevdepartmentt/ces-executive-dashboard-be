/*
  Warnings:

  - A unique constraint covering the columns `[b2b_account_id,id]` on the table `AccountMapping` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AccountMapping_b2b_account_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "AccountMapping_b2b_account_id_id_key" ON "AccountMapping"("b2b_account_id", "id");
