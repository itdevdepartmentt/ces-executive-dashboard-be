-- CreateEnum
CREATE TYPE "MassStaffRole" AS ENUM ('AGENT', 'TEAM_LEADER');

-- AlterTable
ALTER TABLE "MassTicket" ADD COLUMN     "id_koordinasi_summary" TEXT,
ADD COLUMN     "todo_summary" TEXT;

-- CreateTable
CREATE TABLE "MassStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "MassStaffRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MassStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MassStaff_role_is_active_idx" ON "MassStaff"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "MassStaff_name_role_key" ON "MassStaff"("name", "role");
