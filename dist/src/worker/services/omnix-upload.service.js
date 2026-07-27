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
var OmnixUploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmnixUploadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
const excel_utils_helper_1 = require("../excel-utils.helper");
const fs = __importStar(require("fs"));
const rules_constant_1 = require("../utils/rules.constant");
let OmnixUploadService = OmnixUploadService_1 = class OmnixUploadService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    logger = new common_1.Logger(OmnixUploadService_1.name);
    vipRegex = /vvip|vip|direk|director|komisaris/i;
    HEADERS = {
        ticketId: 'ticket_id',
        remark: 'remark',
        subject: 'subject',
        priorityId: 'priority_id',
        priorityName: 'priority_name',
        ticketStatusId: 'ticket_status_id',
        ticketStatusName: 'ticket_status_name',
        unitId: 'unit_id',
        unitName: 'unit_name',
        informantId: 'informant_id',
        informantName: 'informant_name',
        informantHp: 'informant_hp',
        informantEmail: 'informant_email',
        customerId: 'customer_id',
        customerName: 'customer_name',
        customerHp: 'customer_hp',
        customerEmail: 'customer_email',
        dateOriginInteraction: 'date_origin_interaction',
        dateStartInteraction: 'date_start_interaction',
        dateOpen: 'date_open',
        dateClose: 'date_close',
        dateLastUpdate: 'date_last_update',
        isEscalated: 'is_escalated',
        createdById: 'created_by_id',
        createdByName: 'created_by_name',
        updatedById: 'updated_by_id',
        updatedByName: 'updated_by_name',
        channelId: 'channel_id',
        sessionId: 'session_id',
        categoryId: 'category_id',
        categoryName: 'category_name',
        dateCreatedAt: 'date_created_at',
        sla: 'sla',
        channelName: 'channel_name',
        mainCategory: 'mainCategory',
        category: 'category',
        subCategory: 'subCategory',
        detailSubCategory: 'detailSubCategory',
        detailSubCategory2: 'detailSubCategory2',
        datePickupInteraction: 'date_pickup_interaction',
        dateEndInteraction: 'date_end_interaction',
        dateFirstPickupInteraction: 'date_first_pickup_interaction',
        dateFirstResponseInteraction: 'date_first_response_interaction',
        account: 'account',
        accountName: 'account_name',
        informantMemberId: 'informant_member_id',
        customerMemberId: 'customer_member_id',
        sentimentIncoming: 'sentiment_incoming',
        sentimentOutgoing: 'sentiment_outgoing',
        sentimentAll: 'sentiment_all',
        feedback: 'feedback',
        sentimentService: 'sentiment_service',
        parentId: 'parent_id',
        countMerged: 'count_merged',
        sourceId: 'source_id',
        sourceName: 'source_name',
        contact: 'contact',
        surveyName: 'survey_name',
        interactionAdditionalInfo: 'interaction_additional_info',
        surveyId: 'survey_id',
        respondentId: 'respondent_id',
        ticketIdOld: 'ticket_id_old',
        waitingTime: 'waitingTime',
        serviceTime: 'serviceTime',
        responseTime: 'responseTime',
        handlingTime: 'handlingTime',
        duration: 'duration',
        acw: 'acw',
        ticketPerusahaan: 'ticket_perusahaan',
        ticketAmount: 'ticket_Amount',
        ticketRemedyNo: 'ticket_Remedy_NO',
        ticketITAO: 'ticket_IT/AO',
        ticketProject: 'ticket_Project',
        slaSecond: 'sla_second',
        ticketIdMasking: 'ticketId_masking',
        informantNamaCorp: 'informant_nama_corp',
        customerNamaCorp: 'customer_nama_corp',
        datePending: 'date_pending',
        dateResolve: 'date_resolve',
        dateEskalasiEbo: 'date_eskalasi_ebo',
        dateEskalasiIt: 'date_eskalasi_it',
        dateEskalasiNo: 'date_eskalasi_no',
        dateEskalasiPartner: 'date_eskalasi_partner',
        dateMenungguApprovalBillco: 'date_menunggu_approval_billco',
        customerInstagramId: 'customer_instagram_id',
        customerPhone: 'customer_phone',
        customerFacebookId: 'customer_facebook_id',
    };
    async process(job) {
        const kipMap = await this.createLookupMap(this.prisma.lookupKIP, 'compositeKeyOmnix', 'product');
        const accountMap = await this.createLookupMap(this.prisma.accountMapping, 'corporateName', 'kategoriAccount');
        const fcrMap = await this.createLookupMap(this.prisma.lookupKIP, 'compositeKeyOmnix', 'isFcr');
        const fcrMassalMap = await this.createLookupMap(this.prisma.lookupKIP, 'compositeKeyOmnix', 'fcrNonMassal');
        const agentMap = await this.createLookupMap(this.prisma.lookupAgent, 'namaAgent', 'group');
        this.logger.log(`Starting Omnix Batch Upload Service`);
        const filePath = job.data.path;
        if (!fs.existsSync(filePath)) {
            console.error(`File missing at path: ${filePath}`);
            throw new Error(`File not found: ${filePath} - likely a stale job.`);
        }
        const batchSize = 1000;
        let rowsToInsert = [];
        const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
        let headerMap = new Map();
        for await (const worksheet of workbook) {
            for await (const row of worksheet) {
                if (row.number === 1) {
                    headerMap = this.buildHeaderMap(row);
                    continue;
                }
                const H = this.HEADERS;
                const col = (headerName) => this.getCellByHeader(row, headerMap, headerName);
                const classification = this.classifyTicket(row, headerMap);
                const rawNamaPerusahaan = col(H.ticketPerusahaan).text;
                const normalizedNamaPerusahaan = typeof rawNamaPerusahaan === 'string'
                    ? rawNamaPerusahaan.trim().toLowerCase()
                    : '';
                const derivedAccountCategory = accountMap.get(normalizedNamaPerusahaan || '');
                const ticketSubject = col(H.subject).text || '';
                const isVip = this.vipRegex.test(ticketSubject);
                const jumlahMsisdn = excel_utils_helper_1.ExcelUtils.parseSafeInt(col(H.unitId).value);
                const compositeFcrKey = `${col(H.mainCategory).text}_${col(H.category).text}_${col(H.subCategory).text}`
                    .trim()
                    .toLowerCase();
                const detailSubCategory = col(H.detailSubCategory).text.trim();
                const detailSubCategory2 = col(H.detailSubCategory2).text.trim();
                let fcrStatus;
                if (!jumlahMsisdn || jumlahMsisdn <= 2) {
                    const isFcrSatuan = fcrMap.get(compositeFcrKey) || false;
                    fcrStatus = isFcrSatuan;
                }
                else {
                    const isFcrMassal = fcrMassalMap.get(compositeFcrKey) == 'FCR';
                    fcrStatus = isFcrMassal;
                }
                let derivedProduct = kipMap.get(compositeFcrKey || '-');
                const agentName = (col(H.createdByName).text || col(H.updatedByName).text || '')
                    .trim()
                    .toLowerCase();
                const agentGroup = agentMap.get(agentName) || '';
                if (!derivedProduct) {
                    if (/TC|Engineer/i.test(agentGroup)) {
                        this.logger.debug(`Applying fallback product logic for Omnix Ticket ${col(H.ticketId).text} due to missing KIP mapping`);
                        derivedProduct = 'SOLUTION';
                        fcrStatus = true;
                    }
                    else {
                        derivedProduct = 'CONNECTIVITY';
                    }
                }
                const channel = this.determineChannel(row, col, H);
                if (channel === 'callcenter') {
                    fcrStatus = false;
                }
                const slaStatus = classification.isValid
                    ? (0, rules_constant_1.calculateSlaStatus)({
                        product: derivedProduct,
                        ticketCreated: col(H.dateStartInteraction).text,
                        resolveTime: col(H.dateClose).text,
                    })
                    : false;
                const typeEskalasi = (0, rules_constant_1.determineEskalasi)({
                    'ID Remedy_NO': col(H.ticketRemedyNo).text,
                    'Eskalasi/ID Remedy_IT/AO/EMS': col(H.ticketITAO).text,
                });
                const fcrRealisasi = (!typeEskalasi || typeEskalasi === '-') ? true : false;
                const parseIntSafe = (value) => {
                    const parsed = parseInt(value);
                    return isNaN(parsed) ? null : parsed;
                };
                const parseJsonSafe = (value) => {
                    if (!value)
                        return null;
                    try {
                        return typeof value === 'object' ? value : JSON.parse(value);
                    }
                    catch (e) {
                        return null;
                    }
                };
                const rowData = {
                    ticketId: parseIntSafe(col(H.ticketId).value),
                    remark: col(H.remark).text,
                    subject: col(H.subject).text,
                    priorityId: parseIntSafe(col(H.priorityId).value),
                    priorityName: col(H.priorityName).text,
                    ticketStatusId: parseIntSafe(col(H.ticketStatusId).value),
                    ticketStatusName: col(H.ticketStatusName).text,
                    unitId: parseIntSafe(col(H.unitId).value),
                    unitName: col(H.unitName).text,
                    informantId: col(H.informantId).text,
                    informantName: col(H.informantName).text,
                    informantHp: col(H.informantHp).text,
                    informantEmail: col(H.informantEmail).text,
                    customerId: col(H.customerId).text,
                    customerName: col(H.customerName).text,
                    customerHp: col(H.customerHp).text,
                    customerEmail: col(H.customerEmail).text,
                    dateOriginInteraction: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateOriginInteraction).value),
                    dateStartInteraction: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateStartInteraction).value),
                    dateOpen: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateOpen).value),
                    dateClose: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateClose).value),
                    dateLastUpdate: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateLastUpdate).value),
                    isEscalated: col(H.isEscalated).text,
                    createdById: parseIntSafe(col(H.createdById).value),
                    createdByName: col(H.createdByName).text,
                    updatedById: parseIntSafe(col(H.updatedById).value),
                    updatedByName: col(H.updatedByName).text,
                    channelId: parseIntSafe(col(H.channelId).value),
                    sessionId: col(H.sessionId).text,
                    categoryId: parseIntSafe(col(H.categoryId).value),
                    categoryName: col(H.categoryName).text,
                    dateCreatedAt: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateCreatedAt).value),
                    sla: col(H.sla).text,
                    channelNameOmnix: col(H.channelName).text,
                    channelName: channel,
                    mainCategory: col(H.mainCategory).text,
                    category: col(H.category).text,
                    subCategory: col(H.subCategory).text,
                    detailSubCategory: col(H.detailSubCategory).text,
                    detailSubCategory2: col(H.detailSubCategory2).text,
                    datePickupInteraction: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.datePickupInteraction).value),
                    dateEndInteraction: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateEndInteraction).value),
                    dateFirstPickupInteraction: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateFirstPickupInteraction).value),
                    dateFirstResponseInteraction: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateFirstResponseInteraction).value),
                    account: col(H.account).text,
                    accountName: col(H.accountName).text,
                    informantMemberId: col(H.informantMemberId).text,
                    customerMemberId: col(H.customerMemberId).text,
                    sentimentIncoming: col(H.sentimentIncoming).text,
                    sentimentOutgoing: col(H.sentimentOutgoing).text,
                    sentimentAll: col(H.sentimentAll).text,
                    feedback: col(H.feedback).text,
                    sentimentService: col(H.sentimentService).text,
                    parentId: col(H.parentId).text,
                    countMerged: parseIntSafe(col(H.countMerged).value),
                    sourceId: parseIntSafe(col(H.sourceId).value),
                    sourceName: col(H.sourceName).text,
                    contact: parseJsonSafe(col(H.contact).text),
                    surveyName: col(H.surveyName).text,
                    interactionAdditionalInfo: parseJsonSafe(col(H.interactionAdditionalInfo).text),
                    surveyId: col(H.surveyId).text,
                    respondentId: col(H.respondentId).text,
                    ticketIdOld: col(H.ticketIdOld).text,
                    waitingTime: col(H.waitingTime).text,
                    serviceTime: col(H.serviceTime).text,
                    responseTime: col(H.responseTime).text,
                    handlingTime: col(H.handlingTime).text,
                    duration: col(H.duration).text,
                    acw: col(H.acw).text,
                    ticketPerusahaan: col(H.ticketPerusahaan).text,
                    ticketAmount: col(H.ticketAmount).text,
                    ticketRemedyNo: col(H.ticketRemedyNo).text,
                    ticketITAO: col(H.ticketITAO).text,
                    ticketProject: col(H.ticketProject).text,
                    slaSecond: parseIntSafe(col(H.slaSecond).value),
                    ticketIdMasking: col(H.ticketIdMasking).text,
                    informantNamaCorp: col(H.informantNamaCorp).text,
                    customerNamaCorp: col(H.customerNamaCorp).text,
                    datePending: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.datePending).value),
                    dateResolve: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateResolve).value),
                    dateEskalasiEbo: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateEskalasiEbo).value),
                    dateEskalasiIt: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateEskalasiIt).value),
                    dateEskalasiNo: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateEskalasiNo).value),
                    dateEskalasiPartner: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateEskalasiPartner).value),
                    dateMenungguApprovalBillco: excel_utils_helper_1.ExcelUtils.parseExcelDate(col(H.dateMenungguApprovalBillco).value),
                    customerInstagramId: col(H.customerInstagramId).text,
                    customerPhone: col(H.customerPhone).text,
                    customerFacebookId: col(H.customerFacebookId).text,
                    validationStatus: classification.status,
                    statusTiket: classification.isValid,
                    product: derivedProduct?.toUpperCase() || '-',
                    inSla: slaStatus,
                    isFcr: fcrStatus,
                    isFcrRealisasi: fcrRealisasi,
                    eskalasi: typeEskalasi,
                    isPareto: derivedAccountCategory === 'P1' ? true : false,
                    isVip: isVip,
                };
                rowsToInsert.push(rowData);
                if (rowsToInsert.length >= batchSize) {
                    this.logger.log(`Saving batch of ${rowsToInsert.length} Omnix rows...`);
                    await this.saveBatch(rowsToInsert);
                    rowsToInsert = [];
                }
            }
        }
        if (rowsToInsert.length > 0) {
            await this.saveBatch(rowsToInsert);
        }
        this.logger.log(`Omnix Batch Upload Service Completed`);
        return { status: 'Completed' };
    }
    async saveBatch(rows) {
        if (rows.length === 0)
            return;
        const uniqueRowsMap = new Map();
        const internalDuplicates = [];
        for (const row of rows) {
            if (!row.ticketId)
                continue;
            const uniqueKey = row.ticketId;
            if (uniqueRowsMap.has(uniqueKey)) {
                internalDuplicates.push({
                    ticketId: row.ticketId,
                    reason: 'Duplicate found inside the same Excel batch',
                });
            }
            uniqueRowsMap.set(uniqueKey, row);
        }
        if (internalDuplicates.length > 0) {
            console.log('Internal Omnix Duplicates Skipped:', internalDuplicates.length);
        }
        const cleanRows = Array.from(uniqueRowsMap.values());
        if (cleanRows.length === 0)
            return;
        const values = cleanRows
            .map((row) => {
            return `(
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.remark)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.subject)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.priorityId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.priorityName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketStatusId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketStatusName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.unitId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.unitName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.informantId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.informantName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.informantHp)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.informantEmail)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerHp)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerEmail)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateOriginInteraction)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateStartInteraction)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateOpen)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateClose)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateLastUpdate)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isEscalated)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.createdById)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.createdByName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.updatedById)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.updatedByName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.channelId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sessionId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.categoryId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.categoryName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateCreatedAt)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sla)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.channelNameOmnix)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.channelName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.mainCategory)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.category)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.subCategory)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.detailSubCategory)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.detailSubCategory2)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.datePickupInteraction)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateEndInteraction)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateFirstPickupInteraction)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateFirstResponseInteraction)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.account)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.accountName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.informantMemberId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerMemberId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sentimentIncoming)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sentimentOutgoing)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sentimentAll)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.feedback)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sentimentService)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.parentId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.countMerged)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sourceId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sourceName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.contact)},  
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.surveyName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.interactionAdditionalInfo)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.surveyId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.respondentId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketIdOld)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.waitingTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.serviceTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.responseTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.handlingTime)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.duration)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.acw)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketPerusahaan)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketAmount)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketRemedyNo)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketITAO)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketProject)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.slaSecond)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketIdMasking)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.informantNamaCorp)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerNamaCorp)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.datePending)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateResolve)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateEskalasiEbo)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateEskalasiIt)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateEskalasiNo)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateEskalasiPartner)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.dateMenungguApprovalBillco)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerInstagramId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerPhone)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerFacebookId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.validationStatus)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.statusTiket)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.product)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.inSla)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isFcr)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isFcrRealisasi)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.eskalasi)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isVip)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isPareto)}
      )`;
        })
            .join(',');
        const query = `
      INSERT INTO "RawOmnix" (
          "ticket_id", "remark", "subject", "priority_id", "priority_name",
          "ticket_status_id", "ticket_status_name", "unit_id", "unit_name",
          "informant_id", "informant_name", "informant_hp", "informant_email",
          "customer_id", "customer_name", "customer_hp", "customer_email",
          "date_origin_interaction", "date_start_interaction", "date_open",
          "date_close", "date_last_update", "is_escalated",
          "created_by_id", "created_by_name", "updated_by_id", "updated_by_name",
          "channel_id", "session_id", "category_id", "category_name",
          "date_created_at", "sla", "channel_name_omnix", "channel_name",
          "mainCategory", "category", "subCategory", "detailSubCategory", "detailSubCategory2",
          "date_pickup_interaction", "date_end_interaction", 
          "date_first_pickup_interaction", "date_first_response_interaction",
          "account", "account_name", "informant_member_id", "customer_member_id",
          "sentiment_incoming", "sentiment_outgoing", "sentiment_all", "feedback", "sentiment_service",
          "parent_id", "count_merged", "source_id", "source_name",
          "contact", "survey_name", "interaction_additional_info",
          "survey_id", "respondent_id", "ticket_id_old",
          "waitingTime", "serviceTime", "responseTime", "handlingTime", "duration", "acw",
          "ticket_perusahaan", "ticket_Amount", "ticket_Remedy_NO",
          "ticket_IT/AO", "ticket_Project", "sla_second", "ticketId_masking",
          "informant_nama_corp", "customer_nama_corp",
          "date_pending", "date_resolve", 
          "date_eskalasi_ebo", "date_eskalasi_it", "date_eskalasi_no", "date_eskalasi_partner",
          "date_menunggu_approval_billco",
          "customer_instagram_id", "customer_phone", "customer_facebook_id",
          "validationStatus", "statusTiket", "product","inSla", "isFcr", "isFcrRealisasi", "eskalasi", "isVip", "isPareto"
      )
      VALUES ${values}
      ON CONFLICT ("ticket_id") 
      DO UPDATE SET
          "remark" = EXCLUDED."remark",
          "subject" = EXCLUDED."subject",
          "priority_id" = EXCLUDED."priority_id",
          "priority_name" = EXCLUDED."priority_name",
          "ticket_status_id" = EXCLUDED."ticket_status_id",
          "ticket_status_name" = EXCLUDED."ticket_status_name",
          "unit_id" = EXCLUDED."unit_id",
          "unit_name" = EXCLUDED."unit_name",
          "informant_id" = EXCLUDED."informant_id",
          "informant_name" = EXCLUDED."informant_name",
          "informant_hp" = EXCLUDED."informant_hp",
          "informant_email" = EXCLUDED."informant_email",
          "customer_id" = EXCLUDED."customer_id",
          "customer_name" = EXCLUDED."customer_name",
          "customer_hp" = EXCLUDED."customer_hp",
          "customer_email" = EXCLUDED."customer_email",
          "date_origin_interaction" = EXCLUDED."date_origin_interaction",
          "date_start_interaction" = EXCLUDED."date_start_interaction",
          "date_open" = EXCLUDED."date_open",
          "date_close" = EXCLUDED."date_close",
          "date_last_update" = EXCLUDED."date_last_update",
          "is_escalated" = EXCLUDED."is_escalated",
          "created_by_id" = EXCLUDED."created_by_id",
          "created_by_name" = EXCLUDED."created_by_name",
          "updated_by_id" = EXCLUDED."updated_by_id",
          "updated_by_name" = EXCLUDED."updated_by_name",
          "channel_id" = EXCLUDED."channel_id",
          "session_id" = EXCLUDED."session_id",
          "category_id" = EXCLUDED."category_id",
          "category_name" = EXCLUDED."category_name",
          "date_created_at" = EXCLUDED."date_created_at",
          "sla" = EXCLUDED."sla",
          "channel_name_omnix" = EXCLUDED."channel_name_omnix",
          "channel_name" = EXCLUDED."channel_name",
          "mainCategory" = EXCLUDED."mainCategory",
          "category" = EXCLUDED."category",
          "subCategory" = EXCLUDED."subCategory",
          "detailSubCategory" = EXCLUDED."detailSubCategory",
          "detailSubCategory2" = EXCLUDED."detailSubCategory2",
          "date_pickup_interaction" = EXCLUDED."date_pickup_interaction",
          "date_end_interaction" = EXCLUDED."date_end_interaction",
          "date_first_pickup_interaction" = EXCLUDED."date_first_pickup_interaction",
          "date_first_response_interaction" = EXCLUDED."date_first_response_interaction",
          "account" = EXCLUDED."account",
          "account_name" = EXCLUDED."account_name",
          "informant_member_id" = EXCLUDED."informant_member_id",
          "customer_member_id" = EXCLUDED."customer_member_id",
          "sentiment_incoming" = EXCLUDED."sentiment_incoming",
          "sentiment_outgoing" = EXCLUDED."sentiment_outgoing",
          "sentiment_all" = EXCLUDED."sentiment_all",
          "feedback" = EXCLUDED."feedback",
          "sentiment_service" = EXCLUDED."sentiment_service",
          "parent_id" = EXCLUDED."parent_id",
          "count_merged" = EXCLUDED."count_merged",
          "source_id" = EXCLUDED."source_id",
          "source_name" = EXCLUDED."source_name",
          "contact" = EXCLUDED."contact",
          "survey_name" = EXCLUDED."survey_name",
          "interaction_additional_info" = EXCLUDED."interaction_additional_info",
          "survey_id" = EXCLUDED."survey_id",
          "respondent_id" = EXCLUDED."respondent_id",
          "ticket_id_old" = EXCLUDED."ticket_id_old",
          "waitingTime" = EXCLUDED."waitingTime",
          "serviceTime" = EXCLUDED."serviceTime",
          "responseTime" = EXCLUDED."responseTime",
          "handlingTime" = EXCLUDED."handlingTime",
          "duration" = EXCLUDED."duration",
          "acw" = EXCLUDED."acw",
          "ticket_perusahaan" = EXCLUDED."ticket_perusahaan",
          "ticket_Amount" = EXCLUDED."ticket_Amount",
          "ticket_Remedy_NO" = EXCLUDED."ticket_Remedy_NO",
          "ticket_IT/AO" = EXCLUDED."ticket_IT/AO",
          "ticket_Project" = EXCLUDED."ticket_Project",
          "sla_second" = EXCLUDED."sla_second",
          "ticketId_masking" = EXCLUDED."ticketId_masking",
          "informant_nama_corp" = EXCLUDED."informant_nama_corp",
          "customer_nama_corp" = EXCLUDED."customer_nama_corp",
          "date_pending" = EXCLUDED."date_pending",
          "date_resolve" = EXCLUDED."date_resolve",
          "date_eskalasi_ebo" = EXCLUDED."date_eskalasi_ebo",
          "date_eskalasi_it" = EXCLUDED."date_eskalasi_it",
          "date_eskalasi_no" = EXCLUDED."date_eskalasi_no",
          "date_eskalasi_partner" = EXCLUDED."date_eskalasi_partner",
          "date_menunggu_approval_billco" = EXCLUDED."date_menunggu_approval_billco",
          "customer_instagram_id" = EXCLUDED."customer_instagram_id",
          "customer_phone" = EXCLUDED."customer_phone",
          "customer_facebook_id" = EXCLUDED."customer_facebook_id",
          "validationStatus" = EXCLUDED."validationStatus",
          "statusTiket" = EXCLUDED."statusTiket",
          "product" = EXCLUDED."product",
          "inSla" = EXCLUDED."inSla",
          "isFcr" = EXCLUDED."isFcr",
          "isFcrRealisasi" = EXCLUDED."isFcrRealisasi",
          "eskalasi" = EXCLUDED."eskalasi",
          "isVip" = EXCLUDED."isVip",
          "isPareto" = EXCLUDED."isPareto";

    `;
        await this.prisma.$executeRawUnsafe(query);
    }
    buildHeaderMap(row) {
        const map = new Map();
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            if (cell.text) {
                map.set(cell.text.trim().toLowerCase(), colNumber);
            }
        });
        return map;
    }
    getCellByHeader(row, headerMap, headerName) {
        const colIndex = headerMap.get(headerName.trim().toLowerCase());
        if (!colIndex) {
            return { text: '', value: null };
        }
        return row.getCell(colIndex);
    }
    classifyTicket(row, headerMap) {
        for (const rule of rules_constant_1.TICKET_RULES_OMNIX) {
            const cellValue = this.getCellByHeader(row, headerMap, rule.column).text;
            if (cellValue && rule.check(cellValue)) {
                return {
                    status: rule.status,
                    isValid: false,
                    reason: `Matched ${rule.status} rule on ${rule.column}`,
                };
            }
        }
        return { status: 'Valid', isValid: true, reason: 'Passed all checks' };
    }
    async createLookupMap(modelDelegate, keyField, valueField) {
        const data = await modelDelegate.findMany({
            select: {
                [keyField]: true,
                [valueField]: true,
            },
        });
        const lookupMap = new Map();
        for (const row of data) {
            const rawKey = row[keyField];
            const value = row[valueField];
            if (rawKey && typeof rawKey === 'string') {
                lookupMap.set(rawKey.trim().toLowerCase(), value || '');
            }
        }
        return lookupMap;
    }
    determineChannel(row, col, H) {
        const channelName = col(H.channelName).text.toLowerCase();
        const contact = col(H.contact).text;
        if (/whatsapp/i.test(channelName)) {
            return 'Whatsapp';
        }
        if (/ig message|fb message/i.test(channelName)) {
            return 'Socmed';
        }
        if (/manual/i.test(channelName)) {
            if (/phone/i.test(contact)) {
                return 'Whatsapp';
            }
            if (/instagram_id/i.test(contact) || /facebook_id/i.test(contact)) {
                return 'Socmed';
            }
        }
        return 'OTHER';
    }
};
exports.OmnixUploadService = OmnixUploadService;
exports.OmnixUploadService = OmnixUploadService = OmnixUploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OmnixUploadService);
//# sourceMappingURL=omnix-upload.service.js.map