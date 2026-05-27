-- AlterTable
ALTER TABLE "News" ADD COLUMN     "category" TEXT,
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PUBLISHED';

-- CreateIndex
CREATE INDEX "AccountMapping_b2b_account_id_idx" ON "AccountMapping"("b2b_account_id");

-- CreateIndex
CREATE INDEX "AccountMapping_group_idx" ON "AccountMapping"("group");

