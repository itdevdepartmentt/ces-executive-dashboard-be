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
var DailyOcaTicketProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyOcaTicketProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const axios_retry_util_1 = require("../utils/axios-retry.util");
const prisma_service_1 = require("../../../prisma/prisma.service");
const rules_constant_1 = require("../utils/rules.constant");
const fcr_realisasi_utils_1 = require("../utils/fcr-realisasi.utils");
const oca_ticket_utils_1 = require("../utils/oca-ticket.utils");
const oca_upsert_service_1 = require("../repository/oca-upsert.service");
const common_1 = require("@nestjs/common");
const excel_utils_helper_1 = require("../excel-utils.helper");
let DailyOcaTicketProcessor = DailyOcaTicketProcessor_1 = class DailyOcaTicketProcessor extends bullmq_1.WorkerHost {
    prisma;
    ocaUpsertService;
    logger = new common_1.Logger(DailyOcaTicketProcessor_1.name);
    constructor(prisma, ocaUpsertService) {
        super();
        this.prisma = prisma;
        this.ocaUpsertService = ocaUpsertService;
    }
    async process(job) {
        const { ticketId, baseData } = job.data;
        const { tickets } = job.data;
        const resultsToUpsert = [];
        const kipMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.lookupKIP, 'compositeKey', 'product');
        const accountMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.accountMapping, 'corporateName', 'kategoriAccount');
        const fcrSatuanMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.lookupKIP, 'compositeKey', 'isFcr');
        const fcrMassalMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.lookupKIP, 'compositeKey', 'fcrNonMassal');
        const agentMap = await (0, oca_ticket_utils_1.createLookupMap)(this.prisma.lookupAgent, 'namaAgent', 'group');
        this.logger.log(`Processing batch of ${tickets.length} tickets...`);
        const processedResults = [];
        const chunkSize = 5;
        for (let i = 0; i < tickets.length; i += chunkSize) {
            const chunk = tickets.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(async (baseTicket) => {
                try {
                    const activityRes = await (0, axios_retry_util_1.axiosPostWithRetry)('https://webapigw.ocatelkom.co.id/oca-interaction/ticketing/list-activity', { ticket_id: baseTicket.ticket_id }, {
                        auth: {
                            username: 'tsel-app-connectivity',
                            password: '@tsel198xMu918230pp',
                        },
                    });
                    const activities = activityRes.data.results || [];
                    const customFields = this.extractLatestCustomFields(activities);
                    let mappedData = this.mapToDomainModel(baseTicket, customFields);
                    const classification = (0, oca_ticket_utils_1.classifyTicket)(mappedData);
                    const iotValue = mappedData.iot?.trim()
                        ? mappedData.iot.trim().toLowerCase()
                        : '-';
                    const compositeFcrKey = `${mappedData.category?.trim() || ''}_${mappedData.subCategory?.trim() || ''}_${mappedData.detailCategory?.trim() || ''}_${iotValue}`
                        .trim()
                        .toLowerCase();
                    const jumlahMsisdn = excel_utils_helper_1.ExcelUtils.parseSafeInt(mappedData.jumlahMsisdn);
                    let fcrStatus;
                    if (!jumlahMsisdn || jumlahMsisdn <= 10) {
                        if (mappedData.detailCategory === '-' && mappedData.iot === '-') {
                            fcrStatus = true;
                        }
                        else {
                            const isFcrSatuan = fcrSatuanMap.get(compositeFcrKey) || false;
                            fcrStatus = isFcrSatuan;
                        }
                    }
                    else {
                        const isFcrMassal = fcrMassalMap.get(compositeFcrKey) == 'FCR';
                        fcrStatus = isFcrMassal;
                    }
                    let derivedProduct = kipMap.get(compositeFcrKey || '-');
                    if (!derivedProduct) {
                        const agentName = mappedData.assignee || mappedData.reporter || '';
                        if (/TC|Engineer/i.test(agentMap.get(agentName.trim().toLowerCase()) || '')) {
                            derivedProduct = 'SOLUTION';
                            fcrStatus = true;
                        }
                        else {
                            derivedProduct = 'CONNECTIVITY';
                        }
                    }
                    const channel = (0, oca_ticket_utils_1.determineChannel)(mappedData, agentMap);
                    if (channel === 'callcenter') {
                        fcrStatus = false;
                    }
                    const rawNamaPerusahaan = mappedData.namaPerusahaan;
                    const normalizedNamaPerusahaan = typeof rawNamaPerusahaan === 'string'
                        ? rawNamaPerusahaan.trim().toLowerCase()
                        : '';
                    const derivedAccountCategory = accountMap.get(normalizedNamaPerusahaan || '');
                    const ticketSubject = mappedData.ticketSubject || '';
                    const isVip = oca_ticket_utils_1.VIP_REGEX.test(ticketSubject);
                    const slaStatus = classification.isValid
                        ? (0, rules_constant_1.calculateSlaStatus)({
                            product: derivedProduct,
                            ticketCreated: mappedData.ticketCreated,
                            resolveTime: mappedData.resolveTime,
                        })
                        : false;
                    const typeEskalasi = (0, rules_constant_1.determineEskalasi)({
                        'ID Remedy_NO': mappedData.idRemedyNo,
                        'Eskalasi/ID Remedy_IT/AO/EMS': mappedData.eskalasiId,
                    });
                    const fcrRealisasiResult = (0, fcr_realisasi_utils_1.calculateOcaFcrRealisasi)({
                        eskalasiAm: mappedData.eskalasiId,
                        description: mappedData.description,
                        idRemedyNo: mappedData.idRemedyNo,
                        reasonOsl: mappedData.reasonOsl,
                        countInboundMessage: excel_utils_helper_1.ExcelUtils.parseSafeInt(mappedData.countInboundMessage) || 0,
                        inSla: slaStatus,
                        msisdn: mappedData.jumlahMsisdn || '',
                        subCategory: mappedData.subCategory || '',
                        detailCategory: mappedData.detailCategory || '',
                    });
                    return {
                        ...mappedData,
                        channel: channel,
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
                    };
                }
                catch (error) {
                    this.logger.error(`Failed to process ticket ${baseTicket.ticket_id}: ${error.message}`);
                    return null;
                }
            });
            const chunkResults = await Promise.all(chunkPromises);
            processedResults.push(...chunkResults);
            if (i + chunkSize < tickets.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        const validRows = processedResults.filter((row) => row !== null);
        if (validRows.length > 0) {
            await this.ocaUpsertService.saveBatch(validRows);
            this.logger.log(`Successfully saved ${validRows.length} tickets.`);
        }
    }
    extractLatestCustomFields(activities) {
        const state = {
            'Amount Revenue': '0',
            'ID Remedy_NO': '',
            'Jumlah MSISDN': '0',
            'Sub Category': '',
            'Nama Perusahaan': '',
            'Eskalasi/ID Remedy_IT/AO/EMS': '',
            category: '',
            Reporter: '',
            Tags: '',
            'Reason OSL': '',
            'Project ID': '',
            Roaming: '',
            'Detail Category': '',
        };
        const sortedActivities = activities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        for (const act of sortedActivities) {
            const changes = act.object?.additional_info?.changes;
            if (Array.isArray(changes)) {
                for (const change of changes) {
                    if (state.hasOwnProperty(change.name)) {
                        state[change.name] = change.to;
                    }
                }
            }
            else if (changes && typeof changes === 'object') {
            }
            if (act.object?.creator_info?.name) {
                state['Reporter'] = act.object.creator_info.name;
            }
        }
        return state;
    }
    mapToDomainModel(baseData, customFields) {
        return {
            ticketNumber: baseData.ticket_number,
            ticketSubject: baseData.ticket_subject,
            channelOca: baseData.channel,
            category: customFields['category'],
            reporter: customFields['Reporter'],
            assignee: baseData.assigned_data?.name || customFields['Reporter'] || '-',
            department: baseData.department_data?.name ?? '-',
            priority: baseData.priority,
            lastStatus: baseData.status,
            ticketCreated: baseData.created_at,
            lastUpdate: baseData.updated_at,
            description: baseData.detail,
            customerName: baseData.client_name,
            customerPhone: baseData.phone_number,
            customerAddress: '-',
            customerEmail: baseData.client_name,
            firstResponseTime: baseData.as_ticket?.first_executed_at ?? null,
            totalResponseTime: baseData.as_ticket?.resolved_at ?? '~',
            totalResolutionTime: baseData.as_ticket?.resolved_at ?? '-',
            resolveTime: baseData.as_ticket?.resolved_at ?? null,
            resolvedBy: 'agent',
            closedTime: baseData.as_ticket?.resolved_at ?? null,
            ticketDuration: '-',
            countInboundMessage: 0,
            lablInRoom: baseData.room,
            firstResponseDuration: '-',
            escalateTicket: baseData.escalation_to,
            lastAssigneeEscalation: '-',
            lastStatusEscalation: '-',
            lastUpdateEscalation: '-',
            converse: baseData.converse,
            moveToOtherChannel: 'No',
            previousChannel: '-',
            amountRevenue: excel_utils_helper_1.ExcelUtils.parseSafeBigInt(customFields['Amount Revenue'] || 0),
            jumlahMsisdn: customFields['Jumlah MSISDN'],
            tags: customFields['Tags'],
            idRemedyNo: customFields['ID Remedy_NO'],
            eskalasiId: customFields['Eskalasi/ID Remedy_IT/AO/EMS'],
            reasonOsl: customFields['Reason OSL'],
            projectId: customFields['Project ID'],
            namaPerusahaan: customFields['Nama Perusahaan'],
            roaming: customFields['Roaming'],
            subCategory: customFields['Sub Category'],
            detailCategory: customFields['Detail Category'],
            iot: customFields['IOT'],
        };
    }
};
exports.DailyOcaTicketProcessor = DailyOcaTicketProcessor;
exports.DailyOcaTicketProcessor = DailyOcaTicketProcessor = DailyOcaTicketProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('ticket-processing', { concurrency: 1 }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        oca_upsert_service_1.OcaUpsertService])
], DailyOcaTicketProcessor);
//# sourceMappingURL=daily-oca-ticket-processor.js.map