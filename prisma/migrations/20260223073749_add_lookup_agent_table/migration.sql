-- CreateTable
CREATE TABLE "lookup_agent" (
    "id" SERIAL NOT NULL,
    "nama_agent" TEXT,
    "group" TEXT,

    CONSTRAINT "lookup_agent_pkey" PRIMARY KEY ("id")
);
