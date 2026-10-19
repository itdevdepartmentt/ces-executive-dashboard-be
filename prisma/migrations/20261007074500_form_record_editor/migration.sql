ALTER TABLE "FormRecord"
ADD COLUMN "last_edited_by_id" TEXT,
ADD COLUMN "last_edited_by_name" TEXT,
ADD COLUMN "last_edited_by_email" TEXT,
ADD COLUMN "last_edited_at" TIMESTAMP(3);
