"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OcaUploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcaUploadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs = __importStar(require("fs"));
const excel_utils_helper_1 = require("../excel-utils.helper");
const rules_constant_1 = require("../utils/rules.constant");
const fcr_realisasi_utils_1 = require("../utils/fcr-realisasi.utils");
const oca_upsert_service_1 = require("../repository/oca-upsert.service");
const oca_ticket_utils_1 = require("../utils/oca-ticket.utils");
let OcaUploadService = OcaUploadService_1 = class OcaUploadService {
    prisma;
    ocaUpsertService;
    logger = new common_1.Logger(OcaUploadService_1.name);
    constructor(prisma, ocaUpsertService) {
        this.prisma = prisma;
        this.ocaUpsertService = ocaUpsertService;
    }
    async process(job) {
        const kipMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.lookupKIP, 'compositeKey', 'product');
        const accountMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.accountMapping, 'corporateName', 'kategoriAccount');
        const fcrSatuanMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.lookupKIP, 'compositeKey', 'isFcr');
        const fcrMassalMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.lookupKIP, 'compositeKey', 'fcrNonMassal');
        const agentMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.lookupAgent, 'namaAgent', 'group');
        const filePath = job.data.path;
        if (!fs.existsSync(filePath)) {
            console.error(`File missing at path: ${filePath}`);
            throw new Error(`File not found: ${filePath} - likely a stale job.`);
        }
        const batchSize = 1000;
        let rowsToInsert = [];
        const separator = this.detectDelimiter(filePath);
        const stream = fs.createReadStream(filePath).pipe((0, csv_parser_1.default)({
            separator,
            mapHeaders: ({ header }) => header.replace(/^"+|"+$/g, '').trim(),
        }));
        this.logger.log(`Starting Oca CSV Batch Upload Service`);
        for await (const row of stream) {
            const normalizedRow = {
                customerEmail: row['Customer Email'],
                ticketSubject: row['Ticket Subject'],
                department: row['Department'],
                subCategory: row['Sub Category'],
                assignee: row['Assignee'],
                reporter: row['Reporter'],
                description: row['Description'],
                detailCategory: row['Detail Category'],
                channelOca: row['Channel'],
            };
            const classification = (0, oca_ticket_utils_1.classifyTicket)(normalizedRow);
            const rawNamaPerusahaan = row['Nama Perusahaan'];
            const normalizedNamaPerusahaan = typeof rawNamaPerusahaan === 'string'
                ? rawNamaPerusahaan.trim().toLowerCase()
                : '';
            const derivedAccountCategory = accountMap.get(normalizedNamaPerusahaan || '');
            const ticketSubject = row['Ticket Subject'] || '';
            const isVip = oca_ticket_utils_1.VIP_REGEX.test(ticketSubject);
            const iotValue = row['IOT']?.trim() ? row['IOT'].trim().toLowerCase() : "-";
            this.logger.log(`Processing Ticket ${row['Ticket Number']}: IOT value is '${row['IOT']}', normalized to '${iotValue}'`);
            const compositeFcrKey = `${row['Category'].trim()}_${row['Sub Category'].trim()}_${row['Detail Category'].trim()}_${iotValue}`
                .trim()
                .toLowerCase();
            const jumlahMsisdn = excel_utils_helper_1.ExcelUtils.parseSafeInt(row['Jumlah MSISDN']);
            let fcrStatus;
            if (!jumlahMsisdn || jumlahMsisdn <= 10) {
                if (row['Detail Category'] === '-' && row['IOT'] === '-') {
                    fcrStatus = true;
                    if (row['Ticket Number'] === 'TICKET-2228486') {
                        this.logger.debug(`Debugging Ticket TICKET-2228486: -`);
                    }
                }
                else {
                    const isFcrSatuan = fcrSatuanMap.get(compositeFcrKey) || false;
                    fcrStatus = isFcrSatuan;
                    if (row['Ticket Number'] === 'TICKET-2228486') {
                        this.logger.debug(`Debugging Ticket TICKET-2228486: fcr satuan`);
                    }
                }
            }
            else {
                const isFcrMassal = fcrMassalMap.get(compositeFcrKey) == 'FCR' ? true : false;
                fcrStatus = isFcrMassal;
                if (row['Ticket Number'] === 'TICKET-2228486') {
                    this.logger.debug(`Debugging Ticket TICKET-2228486: fcr massal`);
                }
            }
            if (row['Ticket Number'] === 'TICKET-2228486') {
                this.logger.debug(`Debugging Ticket TICKET-2228486: compositeFcrKey=${compositeFcrKey}, jumlahMsisdn=${jumlahMsisdn}, fcrStatus=${fcrStatus}`);
            }
            let derivedProduct = kipMap.get(compositeFcrKey || '-');
            if (!derivedProduct) {
                const agentName = row['Assignee'] || row['Reporter'] || '';
                if (/TC|Engineer/i.test(agentMap.get(agentName.trim().toLowerCase()) || '')) {
                    this.logger.debug(`Applying fallback product logic for Ticket ${row['Ticket Number']} due to missing KIP mapping`);
                    derivedProduct = 'SOLUTION';
                    fcrStatus = true;
                }
                else {
                    derivedProduct = 'CONNECTIVITY';
                }
            }
            const channel = (0, oca_ticket_utils_1.determineChannel)({
                department: row['Department'],
                channelOca: row['Channel'],
                ticketSubject: row['Ticket Subject'],
                assignee: row['Assignee'],
            }, agentMap);
            if (channel === 'callcenter') {
                fcrStatus = false;
            }
            const slaStatus = (0, rules_constant_1.calculateSlaStatus)({
                product: derivedProduct,
                ticketCreated: row['Ticket Created'],
                resolveTime: row['Resolve Time'],
            });
            const typeEskalasi = (0, rules_constant_1.determineEskalasi)({
                'ID Remedy_NO': row['ID Remedy_NO'],
                'Eskalasi/ID Remedy_IT/AO/EMS': row['Eskalasi/ID Remedy_IT/AO/EMS'],
            });
            const fcrRealisasiResult = (0, fcr_realisasi_utils_1.calculateOcaFcrRealisasi)({
                eskalasiAm: row['Eskalasi/ID Remedy_IT/AO/EMS'],
                description: row['Description'],
                idRemedyNo: row['ID Remedy_NO'],
                reasonOsl: row['Reason OSL'],
                countInboundMessage: excel_utils_helper_1.ExcelUtils.parseSafeInt(row['Count Inbound Message']) || 0,
                inSla: slaStatus,
                msisdn: row['Jumlah MSISDN'] || '',
                subCategory: row['Sub Category'] || '',
                detailCategory: row['Detail Category'] || '',
            });
            const rowData = {
                ticketNumber: row['Ticket Number'],
                ticketSubject: row['Ticket Subject'],
                channelOca: row['Channel'],
                channel: channel,
                category: row['Category'],
                reporter: row['Reporter'],
                assignee: row['Assignee'],
                department: row['Department'],
                priority: row['Priority'],
                lastStatus: row['Last Status'],
                ticketCreated: excel_utils_helper_1.ExcelUtils.parseExcelDate(row['Ticket Created']),
                lastUpdate: excel_utils_helper_1.ExcelUtils.parseExcelDate(row['Last Update']),
                description: row['Description'],
                customerName: row['Customer Name'],
                customerPhone: row['Customer Phone'],
                customerAddress: row['Customer Address'],
                customerEmail: row['Customer Email'],
                firstResponseTime: excel_utils_helper_1.ExcelUtils.parseExcelDate(row['First Response Time']),
                totalResponseTime: row['Total Response Time'],
                totalResolutionTime: row['Total Resolution Time'],
                resolveTime: excel_utils_helper_1.ExcelUtils.parseExcelDate(row['Resolve Time']),
                resolvedBy: row['Resolved By'],
                closedTime: excel_utils_helper_1.ExcelUtils.parseExcelDate(row['Closed Time']),
                ticketDuration: row['Ticket Duration'],
                countInboundMessage: excel_utils_helper_1.ExcelUtils.parseSafeInt(row['Count Inbound Message']),
                labelInRoom: row['Label In Room'],
                firstResponseDuration: row['First Response Duration'],
                escalateTicket: row['Escalate Ticket'],
                lastAssigneeEscalation: row['Last Assignee Escalation'],
                lastStatusEscalation: row['Last Status Escalation'],
                lastUpdateEscalation: row['Last Update Escalation'],
                converse: row['Converse'],
                moveToOtherChannel: row['Move to other channel'],
                previousChannel: row['Previous channel'],
                amountRevenue: excel_utils_helper_1.ExcelUtils.parseSafeBigInt(row['Amount Revenue']),
                jumlahMsisdn: row['Jumlah MSISDN'],
                tags: row['Tags'],
                idRemedyNo: row['ID Remedy_NO'],
                eskalasiId: row['Eskalasi/ID Remedy_IT/AO/EMS'],
                reasonOsl: row['Reason OSL'],
                projectId: row['Project ID'],
                namaPerusahaan: row['Nama Perusahaan'],
                roaming: row['Roaming'],
                subCategory: row['Sub Category'],
                detailCategory: row['Detail Category'],
                iot: row['IOT'],
                validationStatus: classification.status,
                statusTiket: classification.isValid,
                product: derivedProduct?.toUpperCase() || '-',
                sla: slaStatus,
                fcr: fcrStatus,
                isFcrRealisasi: fcrRealisasiResult.isFcrRealisasi,
                eskalasiRealisasiTarget: fcrRealisasiResult.eskalasiRealisasiTarget,
                eskalasi: typeEskalasi,
                isPareto: derivedAccountCategory === 'P1' ? true : false,
                isVip: isVip,
                updatedAtExcel: excel_utils_helper_1.ExcelUtils.parseExcelDate(row['Updated at']),
            };
            rowsToInsert.push(rowData);
            if (rowsToInsert.length >= batchSize) {
                await this.ocaUpsertService.saveBatch(rowsToInsert);
                rowsToInsert = [];
            }
        }
        if (rowsToInsert.length > 0) {
            await this.ocaUpsertService.saveBatch(rowsToInsert);
        }
        this.logger.log(`Oca CSV Batch Upload Service Completed`);
        return { status: 'CSV Ticket Report Completed' };
    }
    detectDelimiter(filePath) {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(1024);
        fs.readSync(fd, buffer, 0, buffer.length, 0);
        fs.closeSync(fd);
        const firstLine = buffer.toString('utf8').split('\n')[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        return semicolonCount > commaCount ? ';' : ',';
    }
};
exports.OcaUploadService = OcaUploadService;
exports.OcaUploadService = OcaUploadService = OcaUploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        oca_upsert_service_1.OcaUpsertService])
], OcaUploadService);
//# sourceMappingURL=oca-upload.service.js.map