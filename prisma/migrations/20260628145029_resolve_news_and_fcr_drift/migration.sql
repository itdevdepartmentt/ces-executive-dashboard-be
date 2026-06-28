-- AlterTable
ALTER TABLE "News" ADD COLUMN     "author_id" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RawCall" ADD COLUMN     "isFcrRealisasi" BOOLEAN;

-- AlterTable
ALTER TABLE "RawOca" ADD COLUMN     "eskalasi_realisasi_target" TEXT,
ADD COLUMN     "isFcrRealisasi" BOOLEAN;

-- AlterTable
ALTER TABLE "RawOmnix" ADD COLUMN     "isFcrRealisasi" BOOLEAN;

-- CreateTable
CREATE TABLE "news_comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_comment_like" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_comment_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_activity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "comment_id" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_bookmark" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_field" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dependsOnFieldId" INTEGER,
    "dependsOnValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_response" (
    "id" SERIAL NOT NULL,
    "ticket_id" TEXT,
    "agent_name" TEXT,
    "generated_at" TIMESTAMP(3),
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_response_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_comment_news_id_idx" ON "news_comment"("news_id");

-- CreateIndex
CREATE INDEX "news_comment_user_id_idx" ON "news_comment"("user_id");

-- CreateIndex
CREATE INDEX "news_comment_parent_id_idx" ON "news_comment"("parent_id");

-- CreateIndex
CREATE INDEX "news_comment_like_comment_id_idx" ON "news_comment_like"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "news_comment_like_user_id_comment_id_key" ON "news_comment_like"("user_id", "comment_id");

-- CreateIndex
CREATE INDEX "news_activity_recipient_id_isRead_idx" ON "news_activity"("recipient_id", "isRead");

-- CreateIndex
CREATE INDEX "news_activity_news_id_idx" ON "news_activity"("news_id");

-- CreateIndex
CREATE INDEX "news_bookmark_news_id_idx" ON "news_bookmark"("news_id");

-- CreateIndex
CREATE UNIQUE INDEX "news_bookmark_user_id_news_id_key" ON "news_bookmark"("user_id", "news_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_response_ticket_id_key" ON "survey_response"("ticket_id");

-- CreateIndex
CREATE INDEX "News_author_id_idx" ON "News"("author_id");

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_comment" ADD CONSTRAINT "news_comment_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_comment" ADD CONSTRAINT "news_comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_comment" ADD CONSTRAINT "news_comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "news_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_comment_like" ADD CONSTRAINT "news_comment_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_comment_like" ADD CONSTRAINT "news_comment_like_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "news_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_activity" ADD CONSTRAINT "news_activity_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_activity" ADD CONSTRAINT "news_activity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_activity" ADD CONSTRAINT "news_activity_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_activity" ADD CONSTRAINT "news_activity_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "news_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_bookmark" ADD CONSTRAINT "news_bookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_bookmark" ADD CONSTRAINT "news_bookmark_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
