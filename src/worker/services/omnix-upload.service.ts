import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { ExcelUtils } from '../excel-utils.helper';
import * as fs from 'fs';
import {
  calculateFcrStatus,
  calculateSlaStatus,
  determineEskalasi,
  TICKET_RULES,
  TICKET_RULES_OMNIX,
} from '../utils/rules.constant';

@Injectable()
export class OmnixUploadService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(OmnixUploadService.name);

  // regex to identify VIP keywords
  private readonly vipRegex = /vvip|vip|direk|director|komisaris/i;

  /**
   * Mapping of field names to expected Excel column header names.
   * The lookup is case-insensitive. Update the values here if your Excel headers differ.
   */
  private readonly HEADERS = {
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

  async process(job: Job<any, any, string>): Promise<any> {
    const kipMap = await this.createLookupMap(
      this.prisma.lookupKIP,
      'compositeKeyOmnix',
      'product',
    );

    const accountMap = await this.createLookupMap(
      this.prisma.accountMapping,
      'corporateName',
      'kategoriAccount',
    );

    const fcrMap = await this.createLookupMap(
      this.prisma.lookupKIP,
      'compositeKeyOmnix',
      'isFcr',
    );

    const fcrMassalMap = await this.createLookupMap(
      this.prisma.lookupKIP,
      'compositeKeyOmnix',
      'fcrNonMassal',
    );

    const agentMap = await this.createLookupMap(
      this.prisma.lookupAgent,
      'namaAgent',
      'group',
    );

    this.logger.log(`Starting Omnix Batch Upload Service`);

    const filePath = job.data.path;
    if (!fs.existsSync(filePath)) {
      console.error(`File missing at path: ${filePath}`);
      // Throwing an error here marks the job as FAILED in BullMQ,
      // but it won't crash your entire Node.js server.
      throw new Error(`File not found: ${filePath} - likely a stale job.`);
    }
    const batchSize = 1000;
    let rowsToInsert: any[] = [];

    // 1. Stream the Excel file
    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
    let headerMap: Map<string, number> = new Map();

    for await (const worksheet of workbook) {
      for await (const row of worksheet) {
        if (row.number === 1) {
          headerMap = this.buildHeaderMap(row);
          continue;
        }

        // Helper aliases for clean header-based cell access
        const H = this.HEADERS;
        const col = (headerName: string) =>
          this.getCellByHeader(row, headerMap, headerName);

        const classification = this.classifyTicket(row, headerMap);

        const rawNamaPerusahaan = col(H.ticketPerusahaan).text;
        const normalizedNamaPerusahaan =
          typeof rawNamaPerusahaan === 'string'
            ? rawNamaPerusahaan.trim().toLowerCase()
            : '';
        const derivedAccountCategory = accountMap.get(
          normalizedNamaPerusahaan || '',
        );

        const ticketSubject = col(H.subject).text || '';
        const isVip = this.vipRegex.test(ticketSubject);

        const jumlahMsisdn = ExcelUtils.parseSafeInt(col(H.unitId).value);

        const compositeFcrKey =
          `${col(H.mainCategory).text}_${col(H.category).text}_${col(H.subCategory).text}`
            .trim()
            .toLowerCase();

        const detailSubCategory = col(H.detailSubCategory).text.trim();
        const detailSubCategory2 = col(H.detailSubCategory2).text.trim();

        let fcrStatus;
        if (!jumlahMsisdn || jumlahMsisdn <= 2) {
          const isFcrSatuan = fcrMap.get(compositeFcrKey) || false;
          fcrStatus = isFcrSatuan;
        } else {
          const isFcrMassal = fcrMassalMap.get(compositeFcrKey) == 'FCR';
          fcrStatus = isFcrMassal;
        }

        let derivedProduct = kipMap.get(compositeFcrKey || '-');

        const agentName = (col(H.createdByName).text || col(H.updatedByName).text || '')
          .trim()
          .toLowerCase();
        const agentGroup = agentMap.get(agentName) || '';

        if (
          !derivedProduct &&
          /TC|Engineer/i.test(agentGroup)
        ) {
          this.logger.debug(
            `Applying fallback product logic for Omnix Ticket ${col(H.ticketId).text} due to missing KIP mapping`,
          );
          derivedProduct = 'SOLUTION';
          fcrStatus = true;
        }

        const channel = this.determineChannel(row, col, H);

        if (channel === 'callcenter') {
          fcrStatus = false;
        }

        // --- 2. RUN SLA CALCULATION ---
        const slaStatus = classification.isValid
          ? calculateSlaStatus({
              product: derivedProduct,
              ticketCreated: col(H.dateStartInteraction).text,
              resolveTime: col(H.dateClose).text,
            })
          : false;

        const typeEskalasi = determineEskalasi({
          'ID Remedy_NO': col(H.ticketRemedyNo).text,
          'Eskalasi/ID Remedy_IT/AO/EMS': col(H.ticketITAO).text,
        });

        // Helper to safely parse Integers (returns null if empty or invalid)
        const parseIntSafe = (value: any) => {
          const parsed = parseInt(value);
          return isNaN(parsed) ? null : parsed;
        };

        const parseJsonSafe = (value: any) => {
          if (!value) return null;
          try {
            return typeof value === 'object' ? value : JSON.parse(value);
          } catch (e) {
            return null; // or return value if you want to save as plain string
          }
        };

        const rowData = {
          // --- 1. Basic Ticket Info ---
          ticketId: parseIntSafe(col(H.ticketId).value),
          remark: col(H.remark).text,
          subject: col(H.subject).text,
          priorityId: parseIntSafe(col(H.priorityId).value),
          priorityName: col(H.priorityName).text,
          ticketStatusId: parseIntSafe(col(H.ticketStatusId).value),
          ticketStatusName: col(H.ticketStatusName).text,
          unitId: parseIntSafe(col(H.unitId).value),
          unitName: col(H.unitName).text,

          // --- 2. Informant & Customer ---
          informantId: col(H.informantId).text,
          informantName: col(H.informantName).text,
          informantHp: col(H.informantHp).text,
          informantEmail: col(H.informantEmail).text,
          customerId: col(H.customerId).text,
          customerName: col(H.customerName).text,
          customerHp: col(H.customerHp).text,
          customerEmail: col(H.customerEmail).text,

          // --- 3. Interaction Dates ---
          dateOriginInteraction: ExcelUtils.parseExcelDate(
            col(H.dateOriginInteraction).value,
          ),
          dateStartInteraction: ExcelUtils.parseExcelDate(
            col(H.dateStartInteraction).value,
          ),
          dateOpen: ExcelUtils.parseExcelDate(col(H.dateOpen).value),
          dateClose: ExcelUtils.parseExcelDate(col(H.dateClose).value),
          dateLastUpdate: ExcelUtils.parseExcelDate(
            col(H.dateLastUpdate).value,
          ),

          // --- 4. Categorization ---
          isEscalated: col(H.isEscalated).text,
          createdById: parseIntSafe(col(H.createdById).value),
          createdByName: col(H.createdByName).text,
          updatedById: parseIntSafe(col(H.updatedById).value),
          updatedByName: col(H.updatedByName).text,
          channelId: parseIntSafe(col(H.channelId).value),
          sessionId: col(H.sessionId).text,
          categoryId: parseIntSafe(col(H.categoryId).value),
          categoryName: col(H.categoryName).text,
          dateCreatedAt: ExcelUtils.parseExcelDate(col(H.dateCreatedAt).value),

          // --- 5. Details ---
          sla: col(H.sla).text,
          channelNameOmnix: col(H.channelName).text,
          channelName: channel,
          mainCategory: col(H.mainCategory).text,
          category: col(H.category).text,
          subCategory: col(H.subCategory).text,
          detailSubCategory: col(H.detailSubCategory).text,
          detailSubCategory2: col(H.detailSubCategory2).text,

          // --- 6. More Dates ---
          datePickupInteraction: ExcelUtils.parseExcelDate(
            col(H.datePickupInteraction).value,
          ),
          dateEndInteraction: ExcelUtils.parseExcelDate(
            col(H.dateEndInteraction).value,
          ),
          dateFirstPickupInteraction: ExcelUtils.parseExcelDate(
            col(H.dateFirstPickupInteraction).value,
          ),
          dateFirstResponseInteraction: ExcelUtils.parseExcelDate(
            col(H.dateFirstResponseInteraction).value,
          ),

          // --- 7. Account & Sentiment ---
          account: col(H.account).text,
          accountName: col(H.accountName).text,
          informantMemberId: col(H.informantMemberId).text,
          customerMemberId: col(H.customerMemberId).text,
          sentimentIncoming: col(H.sentimentIncoming).text,
          sentimentOutgoing: col(H.sentimentOutgoing).text,
          sentimentAll: col(H.sentimentAll).text,
          feedback: col(H.feedback).text,
          sentimentService: col(H.sentimentService).text,

          // --- 8. Merging & Source ---
          parentId: col(H.parentId).text,
          countMerged: parseIntSafe(col(H.countMerged).value),
          sourceId: parseIntSafe(col(H.sourceId).value),
          sourceName: col(H.sourceName).text,

          // --- 9. JSON Data ---
          contact: parseJsonSafe(col(H.contact).text),

          // --- 10. Survey & Additional ---
          surveyName: col(H.surveyName).text,
          interactionAdditionalInfo: parseJsonSafe(
            col(H.interactionAdditionalInfo).text,
          ), // Assuming this is also JSON
          surveyId: col(H.surveyId).text,
          respondentId: col(H.respondentId).text,
          ticketIdOld: col(H.ticketIdOld).text,

          // --- 11. Durations ---
          waitingTime: col(H.waitingTime).text,
          serviceTime: col(H.serviceTime).text,
          responseTime: col(H.responseTime).text,
          handlingTime: col(H.handlingTime).text,
          duration: col(H.duration).text,
          acw: col(H.acw).text,

          // --- 12. Specific Custom Fields ---
          ticketPerusahaan: col(H.ticketPerusahaan).text,
          ticketAmount: col(H.ticketAmount).text,
          ticketRemedyNo: col(H.ticketRemedyNo).text,
          ticketITAO: col(H.ticketITAO).text, // Mapped from "ticket_IT/AO"
          ticketProject: col(H.ticketProject).text,
          slaSecond: parseIntSafe(col(H.slaSecond).value),
          ticketIdMasking: col(H.ticketIdMasking).text,
          informantNamaCorp: col(H.informantNamaCorp).text,
          customerNamaCorp: col(H.customerNamaCorp).text,

          // --- 13. Escalation Dates ---
          datePending: ExcelUtils.parseExcelDate(col(H.datePending).value),
          dateResolve: ExcelUtils.parseExcelDate(col(H.dateResolve).value),
          dateEskalasiEbo: ExcelUtils.parseExcelDate(
            col(H.dateEskalasiEbo).value,
          ),
          dateEskalasiIt: ExcelUtils.parseExcelDate(
            col(H.dateEskalasiIt).value,
          ),
          dateEskalasiNo: ExcelUtils.parseExcelDate(
            col(H.dateEskalasiNo).value,
          ),
          dateEskalasiPartner: ExcelUtils.parseExcelDate(
            col(H.dateEskalasiPartner).value,
          ),

          // --- 14. Final Fields ---
          dateMenungguApprovalBillco: ExcelUtils.parseExcelDate(
            col(H.dateMenungguApprovalBillco).value,
          ),
          customerInstagramId: col(H.customerInstagramId).text,
          customerPhone: col(H.customerPhone).text,
          customerFacebookId: col(H.customerFacebookId).text,

          // row tambahan
          validationStatus: classification.status,
          statusTiket: classification.isValid,
          product: derivedProduct?.toUpperCase() || '-',
          inSla: slaStatus,
          isFcr: fcrStatus,
          eskalasi: typeEskalasi,
          isPareto: derivedAccountCategory === 'P1' ? true : false,
          isVip: isVip,
        };

        rowsToInsert.push(rowData);

        if (rowsToInsert.length >= batchSize) {
          this.logger.log(
            `Saving batch of ${rowsToInsert.length} Omnix rows...`,
          );
          await this.saveBatch(rowsToInsert);
          rowsToInsert = [];
        }
      }
    }

    if (rowsToInsert.length > 0) {
      await this.saveBatch(rowsToInsert);
    }

    // 2. RUN SUMMARIZATION
    // await this.refreshDailyStats();
    this.logger.log(`Omnix Batch Upload Service Completed`);
    return { status: 'Completed' };
  }

  private async saveBatch(rows: any[]) {
    if (rows.length === 0) return;

    // 1. DEDUPLICATE IN MEMORY
    const uniqueRowsMap = new Map<number, any>();
    const internalDuplicates: any[] = [];

    for (const row of rows) {
      if (!row.ticketId) continue;

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
      console.log(
        'Internal Omnix Duplicates Skipped:',
        internalDuplicates.length,
      );
    }

    const cleanRows = Array.from(uniqueRowsMap.values());
    if (cleanRows.length === 0) return;

    // 2. Map rows to SQL tuple strings
    const values = cleanRows
      .map((row) => {
        return `(
        ${ExcelUtils.formatSqlValue(row.ticketId)},
        ${ExcelUtils.formatSqlValue(row.remark)},
        ${ExcelUtils.formatSqlValue(row.subject)},
        ${ExcelUtils.formatSqlValue(row.priorityId)},
        ${ExcelUtils.formatSqlValue(row.priorityName)},
        ${ExcelUtils.formatSqlValue(row.ticketStatusId)},
        ${ExcelUtils.formatSqlValue(row.ticketStatusName)},
        ${ExcelUtils.formatSqlValue(row.unitId)},
        ${ExcelUtils.formatSqlValue(row.unitName)},
        ${ExcelUtils.formatSqlValue(row.informantId)},
        ${ExcelUtils.formatSqlValue(row.informantName)},
        ${ExcelUtils.formatSqlValue(row.informantHp)},
        ${ExcelUtils.formatSqlValue(row.informantEmail)},
        ${ExcelUtils.formatSqlValue(row.customerId)},
        ${ExcelUtils.formatSqlValue(row.customerName)},
        ${ExcelUtils.formatSqlValue(row.customerHp)},
        ${ExcelUtils.formatSqlValue(row.customerEmail)},
        ${ExcelUtils.formatSqlValue(row.dateOriginInteraction)},
        ${ExcelUtils.formatSqlValue(row.dateStartInteraction)},
        ${ExcelUtils.formatSqlValue(row.dateOpen)},
        ${ExcelUtils.formatSqlValue(row.dateClose)},
        ${ExcelUtils.formatSqlValue(row.dateLastUpdate)},
        ${ExcelUtils.formatSqlValue(row.isEscalated)},
        ${ExcelUtils.formatSqlValue(row.createdById)},
        ${ExcelUtils.formatSqlValue(row.createdByName)},
        ${ExcelUtils.formatSqlValue(row.updatedById)},
        ${ExcelUtils.formatSqlValue(row.updatedByName)},
        ${ExcelUtils.formatSqlValue(row.channelId)},
        ${ExcelUtils.formatSqlValue(row.sessionId)},
        ${ExcelUtils.formatSqlValue(row.categoryId)},
        ${ExcelUtils.formatSqlValue(row.categoryName)},
        ${ExcelUtils.formatSqlValue(row.dateCreatedAt)},
        ${ExcelUtils.formatSqlValue(row.sla)},
        ${ExcelUtils.formatSqlValue(row.channelNameOmnix)},
        ${ExcelUtils.formatSqlValue(row.channelName)},
        ${ExcelUtils.formatSqlValue(row.mainCategory)},
        ${ExcelUtils.formatSqlValue(row.category)},
        ${ExcelUtils.formatSqlValue(row.subCategory)},
        ${ExcelUtils.formatSqlValue(row.detailSubCategory)},
        ${ExcelUtils.formatSqlValue(row.detailSubCategory2)},
        ${ExcelUtils.formatSqlValue(row.datePickupInteraction)},
        ${ExcelUtils.formatSqlValue(row.dateEndInteraction)},
        ${ExcelUtils.formatSqlValue(row.dateFirstPickupInteraction)},
        ${ExcelUtils.formatSqlValue(row.dateFirstResponseInteraction)},
        ${ExcelUtils.formatSqlValue(row.account)},
        ${ExcelUtils.formatSqlValue(row.accountName)},
        ${ExcelUtils.formatSqlValue(row.informantMemberId)},
        ${ExcelUtils.formatSqlValue(row.customerMemberId)},
        ${ExcelUtils.formatSqlValue(row.sentimentIncoming)},
        ${ExcelUtils.formatSqlValue(row.sentimentOutgoing)},
        ${ExcelUtils.formatSqlValue(row.sentimentAll)},
        ${ExcelUtils.formatSqlValue(row.feedback)},
        ${ExcelUtils.formatSqlValue(row.sentimentService)},
        ${ExcelUtils.formatSqlValue(row.parentId)},
        ${ExcelUtils.formatSqlValue(row.countMerged)},
        ${ExcelUtils.formatSqlValue(row.sourceId)},
        ${ExcelUtils.formatSqlValue(row.sourceName)},
        ${ExcelUtils.formatSqlValue(row.contact)},  
        ${ExcelUtils.formatSqlValue(row.surveyName)},
        ${ExcelUtils.formatSqlValue(row.interactionAdditionalInfo)},
        ${ExcelUtils.formatSqlValue(row.surveyId)},
        ${ExcelUtils.formatSqlValue(row.respondentId)},
        ${ExcelUtils.formatSqlValue(row.ticketIdOld)},
        ${ExcelUtils.formatSqlValue(row.waitingTime)},
        ${ExcelUtils.formatSqlValue(row.serviceTime)},
        ${ExcelUtils.formatSqlValue(row.responseTime)},
        ${ExcelUtils.formatSqlValue(row.handlingTime)},
        ${ExcelUtils.formatSqlValue(row.duration)},
        ${ExcelUtils.formatSqlValue(row.acw)},
        ${ExcelUtils.formatSqlValue(row.ticketPerusahaan)},
        ${ExcelUtils.formatSqlValue(row.ticketAmount)},
        ${ExcelUtils.formatSqlValue(row.ticketRemedyNo)},
        ${ExcelUtils.formatSqlValue(row.ticketITAO)},
        ${ExcelUtils.formatSqlValue(row.ticketProject)},
        ${ExcelUtils.formatSqlValue(row.slaSecond)},
        ${ExcelUtils.formatSqlValue(row.ticketIdMasking)},
        ${ExcelUtils.formatSqlValue(row.informantNamaCorp)},
        ${ExcelUtils.formatSqlValue(row.customerNamaCorp)},
        ${ExcelUtils.formatSqlValue(row.datePending)},
        ${ExcelUtils.formatSqlValue(row.dateResolve)},
        ${ExcelUtils.formatSqlValue(row.dateEskalasiEbo)},
        ${ExcelUtils.formatSqlValue(row.dateEskalasiIt)},
        ${ExcelUtils.formatSqlValue(row.dateEskalasiNo)},
        ${ExcelUtils.formatSqlValue(row.dateEskalasiPartner)},
        ${ExcelUtils.formatSqlValue(row.dateMenungguApprovalBillco)},
        ${ExcelUtils.formatSqlValue(row.customerInstagramId)},
        ${ExcelUtils.formatSqlValue(row.customerPhone)},
        ${ExcelUtils.formatSqlValue(row.customerFacebookId)},
        ${ExcelUtils.formatSqlValue(row.validationStatus)},
        ${ExcelUtils.formatSqlValue(row.statusTiket)},
        ${ExcelUtils.formatSqlValue(row.product)},
        ${ExcelUtils.formatSqlValue(row.inSla)},
        ${ExcelUtils.formatSqlValue(row.isFcr)},
        ${ExcelUtils.formatSqlValue(row.eskalasi)},
        ${ExcelUtils.formatSqlValue(row.isVip)},
        ${ExcelUtils.formatSqlValue(row.isPareto)}
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
          "validationStatus", "statusTiket", "product","inSla", "isFcr", "eskalasi", "isVip", "isPareto"
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
          "eskalasi" = EXCLUDED."eskalasi",
          "isVip" = EXCLUDED."isVip",
          "isPareto" = EXCLUDED."isPareto";

    `;

    await this.prisma.$executeRawUnsafe(query);
  }

  /**
   * Build a header-to-column-index map from the first row of the Excel sheet.
   */
  private buildHeaderMap(row: any): Map<string, number> {
    const map = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell: any, colNumber: number) => {
      if (cell.text) {
        map.set(cell.text.trim().toLowerCase(), colNumber);
      }
    });
    return map;
  }

  /**
   * Get a cell from a row by its header name using the header map.
   * Returns a safe default if the header is not found.
   */
  private getCellByHeader(
    row: any,
    headerMap: Map<string, number>,
    headerName: string,
  ): { text: string; value: any } {
    const colIndex = headerMap.get(headerName.trim().toLowerCase());
    if (!colIndex) {
      return { text: '', value: null };
    }
    return row.getCell(colIndex);
  }

  private classifyTicket(row: any, headerMap: Map<string, number>) {
    // 1. Iterate through defined rules
    for (const rule of TICKET_RULES_OMNIX) {
      const cellValue = this.getCellByHeader(row, headerMap, rule.column).text;

      // If rule matches, return that status immediately (Fail-Fast)
      if (cellValue && rule.check(cellValue)) {
        return {
          status: rule.status,
          isValid: false, // It hit a "Double/EMS/RPA" rule
          reason: `Matched ${rule.status} rule on ${rule.column}`,
        };
      }
    }

    return { status: 'Valid', isValid: true, reason: 'Passed all checks' };
  }

  /**
   * Generic helper to fetch reference data and create a normalized Map
   * @param modelDelegate The prisma model (e.g. this.prisma.kIP)
   * @param keyField The database column to be used as the Map Key (normalized)
   * @param valueField The database column to be used as the Map Value
   */
  private async createLookupMap(
    modelDelegate: any,
    keyField: string,
    valueField: string,
  ): Promise<Map<string, string>> {
    // 1. Dynamic Select: Fetch only the columns we need
    const data = await modelDelegate.findMany({
      select: {
        [keyField]: true,
        [valueField]: true,
      },
    });

    // 2. Build Map with normalization
    const lookupMap = new Map<string, string>();

    for (const row of data) {
      const rawKey = row[keyField];
      const value = row[valueField];

      // Ensure key exists and is a string before processing
      if (rawKey && typeof rawKey === 'string') {
        lookupMap.set(rawKey.trim().toLowerCase(), value || '');
      }
    }

    return lookupMap;
  }

  determineChannel(row: any, col: any, H: any): string {
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
}
