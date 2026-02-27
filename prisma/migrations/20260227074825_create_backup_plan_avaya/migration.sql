-- CreateTable
CREATE TABLE "raw_cc" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "callsoffered" INTEGER NOT NULL,
    "acd_calls" INTEGER NOT NULL,
    "aban_calls" INTEGER NOT NULL,
    "update_stamp" TIMESTAMP(3) NOT NULL,
    "unit_type" TEXT NOT NULL,
    "corp" TEXT,
    "topic_reason_2" TEXT,
    "eskalasi" TEXT,
    "inSla" BOOLEAN,
    "isFcr" BOOLEAN,
    "isPareto" BOOLEAN,
    "isVip" BOOLEAN,
    "product" TEXT,
    "statusTiket" BOOLEAN,
    "validationStatus" TEXT,

    CONSTRAINT "raw_cc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_cc_date_time_sequence_key" ON "raw_cc"("date", "time", "sequence");
