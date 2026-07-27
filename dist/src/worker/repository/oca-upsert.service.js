"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OcaUpsertService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcaUpsertService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const excel_utils_helper_1 = require("../excel-utils.helper");
let OcaUpsertService = OcaUpsertService_1 = class OcaUpsertService {
    prisma;
    logger = new common_1.Logger(OcaUpsertService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async saveBatch(rows) {
        if (rows.length === 0)
            return;
        const uniqueRowsMap = new Map();
        for (const row of rows) {
            if (!row.ticketNumber)
                continue;
            const normalizedTicket = row.ticketNumber.toString().trim().toUpperCase();
            uniqueRowsMap.set(normalizedTicket, {
                ...row,
                ticketNumber: normalizedTicket,
            });
        }
        const cleanRows = Array.from(uniqueRowsMap.values());
        if (cleanRows.length === 0)
            return;
        const values = cleanRows
            .map((row) => {
            return `(
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketNumber)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketSubject)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.channelOca)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.channel)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.category)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.reporter)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.assignee)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.department)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.priority)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.lastStatus)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketCreated)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.lastUpdate)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.description)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerPhone)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerAddress)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerEmail)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.firstResponseTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.totalResponseTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.totalResolutionTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.resolveTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.resolvedBy)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.closedTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketDuration)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.countInboundMessage)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.labelInRoom)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.firstResponseDuration)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.escalateTicket)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.lastAssigneeEscalation)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.lastStatusEscalation)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.lastUpdateEscalation)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.converse)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.moveToOtherChannel)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.previousChannel)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.amountRevenue)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.jumlahMsisdn)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.tags)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.idRemedyNo)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.eskalasiId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.reasonOsl)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.projectId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.namaPerusahaan)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.roaming)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.subCategory)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.detailCategory)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.iot)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.validationStatus)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.statusTiket)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.product)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sla)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.fcr)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.eskalasi)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isVip)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isPareto)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.updatedAtExcel)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isFcrRealisasi)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.eskalasiRealisasiTarget)}
      )`;
        })
            .join(',');
        const query = `
    WITH upsert AS(
INSERT INTO "RawOca" (
    "ticket_number", "ticket_subject", "channel_oca", "channel", "category", 
    "reporter", "assignee", "department", "priority", "last_status",
    "ticket_created", "last_update", "description", 
    "customer_name", "customer_phone", "customer_address", "customer_email",
    "first_response_time", "total_response_time", "total_resolution_time",
    "resolve_time", "resolved_by", "closed_time", "ticket_duration",
    "count_inbound_message", "label_in_room", "first_response_duration",
    "escalate_ticket", "last_assignee_escalation", "last_status_escalation",
    "last_update_escalation", "converse", "move_to_other_channel", "previous_channel",
    "amount_revenue", "jumlah_msisdn", "tags", "id_remedy_no",
    "eskalasi_id_remedy_it_ao_ems", "reason_osl", "project_id", "nama_perusahaan",
    "roaming", "sub_category", "detail_category", "iot", "validationStatus", "statusTiket", "product",
    "inSla", "isFcr", "eskalasi", "isVip", "isPareto", "updated_at_excel",
    "isFcrRealisasi", "eskalasi_realisasi_target"
)
VALUES ${values}
ON CONFLICT ("ticket_number")
DO UPDATE SET
    "ticket_subject"              = EXCLUDED."ticket_subject",
    "channel_oca"                 = EXCLUDED."channel_oca",
    "channel"                     = EXCLUDED."channel",
    "category"                    = EXCLUDED."category",
    "reporter"                    = EXCLUDED."reporter",
    "assignee"                    = EXCLUDED."assignee",
    "department"                  = EXCLUDED."department",
    "priority"                     = EXCLUDED."priority",
    "last_status"                 = EXCLUDED."last_status",
    "ticket_created"              = EXCLUDED."ticket_created",
    "last_update"                 = EXCLUDED."last_update",
    "description"                 = EXCLUDED."description",
    "customer_name"               = EXCLUDED."customer_name",
    "customer_phone"              = EXCLUDED."customer_phone",
    "customer_address"            = EXCLUDED."customer_address",
    "customer_email"              = EXCLUDED."customer_email",
    "first_response_time"         = EXCLUDED."first_response_time",
    "total_response_time"         = EXCLUDED."total_response_time",
    "total_resolution_time"       = EXCLUDED."total_resolution_time",
    "resolve_time"                = EXCLUDED."resolve_time",
    "resolved_by"                 = EXCLUDED."resolved_by",
    "closed_time"                 = EXCLUDED."closed_time",
    "ticket_duration"             = EXCLUDED."ticket_duration",
    "count_inbound_message"       = EXCLUDED."count_inbound_message",
    "label_in_room"               = EXCLUDED."label_in_room",
    "first_response_duration"     = EXCLUDED."first_response_duration",
    "escalate_ticket"             = EXCLUDED."escalate_ticket",
    "last_assignee_escalation"    = EXCLUDED."last_assignee_escalation",
    "last_status_escalation"      = EXCLUDED."last_status_escalation",
    "last_update_escalation"      = EXCLUDED."last_update_escalation",
    "converse"                    = EXCLUDED."converse",
    "move_to_other_channel"       = EXCLUDED."move_to_other_channel",
    "previous_channel"            = EXCLUDED."previous_channel",
    "amount_revenue"              = EXCLUDED."amount_revenue",
    "jumlah_msisdn"               = EXCLUDED."jumlah_msisdn",
    "tags"                        = EXCLUDED."tags",
    "id_remedy_no"                = EXCLUDED."id_remedy_no",
    "eskalasi_id_remedy_it_ao_ems" = EXCLUDED."eskalasi_id_remedy_it_ao_ems",
    "reason_osl"                  = EXCLUDED."reason_osl",
    "project_id"                  = EXCLUDED."project_id",
    "nama_perusahaan"             = EXCLUDED."nama_perusahaan",
    "roaming"                     = EXCLUDED."roaming",
    "sub_category"                = EXCLUDED."sub_category",
    "detail_category"             = EXCLUDED."detail_category",
    "iot"                         = EXCLUDED."iot",
    "validationStatus"            = EXCLUDED."validationStatus",
    "statusTiket"                 = EXCLUDED."statusTiket",
    "product"                     = EXCLUDED."product",
    "inSla"                       = EXCLUDED."inSla",
    "isFcr"                       = EXCLUDED."isFcr",
    "eskalasi"                    = EXCLUDED."eskalasi",
    "isVip"                       = EXCLUDED."isVip",
    "isPareto"                    = EXCLUDED."isPareto",
    "updated_at_excel"            = EXCLUDED."updated_at_excel",
    "isFcrRealisasi"              = EXCLUDED."isFcrRealisasi",
    "eskalasi_realisasi_target"   = EXCLUDED."eskalasi_realisasi_target"
    RETURNING xmax
    )
    SELECT
      COUNT(*) FILTER (WHERE xmax = 0)::int AS inserted,
      COUNT(*) FILTER (WHERE xmax <> 0)::int AS updated
      FROM upsert;
    `;
        const result = await this.prisma.$queryRawUnsafe(query);
        const { inserted, updated } = result[0];
        this.logger.log(`Oca Upsert completed: ${inserted} inserted, ${updated} updated`);
    }
};
exports.OcaUpsertService = OcaUpsertService;
exports.OcaUpsertService = OcaUpsertService = OcaUpsertService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OcaUpsertService);
//# sourceMappingURL=oca-upsert.service.js.map