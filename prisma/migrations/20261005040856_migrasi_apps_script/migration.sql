-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'DATETIME', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'FILE', 'TABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'QC';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TL';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TL_QC';

-- AlterTable
ALTER TABLE "lookup_agent" ADD COLUMN IF NOT EXISTS     "peak1" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "peak2" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "peak3" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS     "tapper" TEXT,
ADD COLUMN IF NOT EXISTS     "team_leader" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "qa_form_tapping" (
    "id" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tapper" TEXT NOT NULL,
    "idTiket" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "jenisInteraksi" TEXT NOT NULL,
    "kipLevel2" TEXT NOT NULL,
    "kipLevel3" TEXT NOT NULL,
    "inOutSla" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "perusahaan" TEXT NOT NULL,
    "customerRequests" TEXT NOT NULL,
    "agentResponse" TEXT NOT NULL,
    "scoreValiditas" INTEGER NOT NULL DEFAULT 0,
    "scoreServiceLevel" INTEGER NOT NULL DEFAULT 0,
    "scoreKalimat" INTEGER NOT NULL DEFAULT 0,
    "scoreResponTime" INTEGER NOT NULL DEFAULT 0,
    "scoreDokumentasi" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Sample',
    "solusi" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tapping_duration" INTEGER,
    "parameter_penilaian" TEXT NOT NULL DEFAULT '',
    "peak" INTEGER NOT NULL DEFAULT 3,
    "sub_parameter_penilaian" TEXT NOT NULL DEFAULT '',
    "team_leader" TEXT NOT NULL DEFAULT '',
    "handling_time" TEXT,
    "tagging" TEXT NOT NULL DEFAULT '',
    "pause_reasons" JSONB NOT NULL DEFAULT '[]',
    "start_time" TIMESTAMP(3),
    "submit_time" TIMESTAMP(3),
    "komitmen" TEXT NOT NULL DEFAULT '',
    "komitmen_status" TEXT NOT NULL DEFAULT 'NONE',
    "created_ticket" TIMESTAMP(3),
    "msisdn" TEXT,

    CONSTRAINT "qa_form_tapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qa_ticket" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idTiket" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "jenisInteraksi" TEXT NOT NULL,
    "kipLevel2" TEXT NOT NULL,
    "kipLevel3" TEXT NOT NULL,
    "inOutSla" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "perusahaan" TEXT NOT NULL,
    "customerRequests" TEXT NOT NULL,
    "agentResponse" TEXT NOT NULL,
    "tapper" TEXT NOT NULL DEFAULT '',
    "team_leader" TEXT NOT NULL DEFAULT '',
    "handling_time" TEXT,
    "created_ticket" TIMESTAMP(3),
    "msisdn" TEXT,

    CONSTRAINT "qa_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qa_reconciliation" (
    "id" TEXT NOT NULL,
    "qa_form_tapping_id" TEXT NOT NULL,
    "tl_name" TEXT NOT NULL,
    "qc_name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proposedScoreValiditas" INTEGER,
    "proposedScoreServiceLevel" INTEGER,
    "proposedScoreKalimat" INTEGER,
    "proposedScoreResponTime" INTEGER,
    "proposedScoreDokumentasi" INTEGER,
    "oldScoreValiditas" INTEGER,
    "oldScoreServiceLevel" INTEGER,
    "oldScoreKalimat" INTEGER,
    "oldScoreResponTime" INTEGER,
    "oldScoreDokumentasi" INTEGER,
    "qc_response_notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discussions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "qa_reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qa_target_setting" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "daily" INTEGER NOT NULL DEFAULT 0,
    "monthly" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT '',
    "peak1" INTEGER NOT NULL DEFAULT 0,
    "peak2" INTEGER NOT NULL DEFAULT 0,
    "peak3" INTEGER NOT NULL DEFAULT 0,
    "tapper" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "qa_target_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "app_notification" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FormDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FormSection" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FormField" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "section_id" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "help_text" TEXT,
    "type" "FormFieldType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "validation" JSONB,
    "columns" JSONB,
    "default_value" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FormRecord" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "ref_number" TEXT,
    "created_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MassTicket" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "ticket_subject" TEXT,
    "last_status" TEXT,
    "ticket_created" TIMESTAMP(3),
    "jumlah_msisdn" INTEGER,
    "detail_category" TEXT,
    "sub_category" TEXT,
    "category" TEXT,
    "nama_perusahaan" TEXT,
    "project_id" TEXT,
    "agent" TEXT DEFAULT '',
    "team_leader" TEXT DEFAULT '',
    "agent_assigned_at" TIMESTAMP(3),
    "agent_change_count" INTEGER NOT NULL DEFAULT 0,
    "waktu_pengerjaan_khusus" TEXT,
    "validation_pic_status" TEXT,
    "validation_pic_notes" TEXT,
    "validation_pks_status" TEXT,
    "validation_pks_notes" TEXT,
    "validation_nodin_status" TEXT,
    "validation_nodin_notes" TEXT,
    "validation_status" TEXT,
    "profiling_status" TEXT,
    "profiling_order_id" TEXT,
    "profiling_notes" TEXT,
    "process_steps" JSONB,
    "confirmations" JSONB,
    "custom_values" JSONB,
    "current_process" TEXT,
    "overall_status" TEXT,
    "process_progress" INTEGER NOT NULL DEFAULT 0,
    "days_open" INTEGER NOT NULL DEFAULT 0,
    "ageing_bucket" TEXT,
    "bottleneck" TEXT,
    "bottleneck_since" TIMESTAMP(3),
    "last_action" TEXT,
    "last_action_by" TEXT,
    "completion_date" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MassTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MassProcessStep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MassProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MassTicketHistory" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "agent" TEXT,
    "team_leader" TEXT,
    "process" TEXT,
    "previous_status" TEXT,
    "new_status" TEXT,
    "coordination" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "order_id" TEXT,
    "bottleneck" TEXT,
    "action_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MassTicketHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MassAssignmentHistory" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "previous_agent" TEXT,
    "new_agent" TEXT,
    "previous_team_leader" TEXT,
    "new_team_leader" TEXT,
    "changed_by" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MassAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MassDailyActivity" (
    "id" TEXT NOT NULL,
    "activity_date" DATE NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "agent" TEXT NOT NULL DEFAULT '',
    "assigned_at" TIMESTAMP(3),
    "worked_at" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MassDailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "qa_target_setting_name_type_tapper_key" ON "qa_target_setting"("name", "type", "tapper");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "app_notification_recipient_id_is_read_idx" ON "app_notification"("recipient_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FormDefinition_key_key" ON "FormDefinition"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FormSection_form_id_order_idx" ON "FormSection"("form_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FormSection_form_id_key_key" ON "FormSection"("form_id", "key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FormField_form_id_order_idx" ON "FormField"("form_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FormField_form_id_key_key" ON "FormField"("form_id", "key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FormRecord_form_id_createdAt_idx" ON "FormRecord"("form_id", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FormRecord_ref_number_idx" ON "FormRecord"("ref_number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MassTicket_ticket_number_key" ON "MassTicket"("ticket_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassTicket_overall_status_idx" ON "MassTicket"("overall_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassTicket_agent_idx" ON "MassTicket"("agent");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassTicket_ticket_created_idx" ON "MassTicket"("ticket_created");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassTicket_ageing_bucket_idx" ON "MassTicket"("ageing_bucket");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassTicket_nama_perusahaan_idx" ON "MassTicket"("nama_perusahaan");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MassProcessStep_name_key" ON "MassProcessStep"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassTicketHistory_ticket_id_createdAt_idx" ON "MassTicketHistory"("ticket_id", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassTicketHistory_ticket_number_idx" ON "MassTicketHistory"("ticket_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassAssignmentHistory_ticket_id_createdAt_idx" ON "MassAssignmentHistory"("ticket_id", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassAssignmentHistory_ticket_number_idx" ON "MassAssignmentHistory"("ticket_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MassDailyActivity_activity_date_idx" ON "MassDailyActivity"("activity_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MassDailyActivity_activity_date_ticket_id_agent_key" ON "MassDailyActivity"("activity_date", "ticket_id", "agent");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "FormSection" ADD CONSTRAINT "FormSection_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "FormDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "FormField" ADD CONSTRAINT "FormField_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "FormDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "FormField" ADD CONSTRAINT "FormField_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "FormSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "FormRecord" ADD CONSTRAINT "FormRecord_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "FormDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MassTicketHistory" ADD CONSTRAINT "MassTicketHistory_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "MassTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MassAssignmentHistory" ADD CONSTRAINT "MassAssignmentHistory_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "MassTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MassDailyActivity" ADD CONSTRAINT "MassDailyActivity_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "MassTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
