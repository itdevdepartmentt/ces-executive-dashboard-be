// ticket.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from 'prisma/prisma.service';
import { calculateSlaStatus, determineEskalasi } from '../utils/rules.constant';
import {
  classifyTicket,
  createLookupMap,
  determineChannel,
  VIP_REGEX,
} from '../utils/oca-ticket.utils';
import { OcaUpsertService } from '../repository/oca-upsert.service';
import { Logger } from '@nestjs/common';
import { ExcelUtils } from '../excel-utils.helper';

@Processor('ticket-processing')
export class DailyOcaTicketProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyOcaTicketProcessor.name);
  constructor(
    private readonly prisma: PrismaService, // Assuming Prisma
    private readonly ocaUpsertService: OcaUpsertService,
    // Inject your logic services here
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { ticketId, baseData } = job.data;
    const { tickets } = job.data; // <--- Receive Array
    const resultsToUpsert = [];

    const kipMap = await createLookupMap(
      this.prisma.lookupKIP,
      'compositeKey',
      'product',
    );

    const accountMap = await createLookupMap(
      this.prisma.accountMapping,
      'corporateName',
      'kategoriAccount',
    );

    const fcrSatuanMap = await createLookupMap(
      this.prisma.lookupKIP,
      'compositeKey',
      'isFcr',
    );

    const fcrMassalMap = await createLookupMap(
      this.prisma.lookupKIP,
      'compositeKey',
      'fcrNonMassal',
    );

    const agentMap = await createLookupMap(
      this.prisma.lookupAgent,
      'namaAgent',
      'group',
    );

    this.logger.log(`Processing batch of ${tickets.length} tickets...`); // 1. Fetch Activity History

    // 2. Process all tickets in the batch concurrently
    // We use Promise.all to hit the API for all 20 tickets in parallel (much faster)
    const processPromises = tickets.map(async (baseTicket) => {
      try {
        // A. Hit API
        const activityRes = await axios.post(
          'https://webapigw.ocatelkom.co.id/oca-interaction/ticketing/list-activity',
          { ticket_id: baseTicket.ticket_id },
          {
            auth: {
              username: 'tsel-app-connectivity',
              password: '@tsel198xMu918230pp',
            },
          },
        );

        // B. Logic (Reconstruct & Map)
        const activities = activityRes.data.results || [];
        const customFields = this.extractLatestCustomFields(activities);

        // Pass maps into mapToDomainModel if needed, or use them here
        let mappedData = this.mapToDomainModel(baseTicket, customFields);

        // C. Calculations (Using the Maps we fetched once)
        const classification = classifyTicket(mappedData);

        const iotValue = mappedData.iot?.trim()
          ? mappedData.iot.trim().toLowerCase()
          : '-';

        const compositeFcrKey =
          `${mappedData.category?.trim() || ''}_${mappedData.subCategory?.trim() || ''}_${mappedData.detailCategory?.trim() || ''}_${iotValue}`
            .trim()
            .toLowerCase();

        const jumlahMsisdn = ExcelUtils.parseSafeInt(mappedData.jumlahMsisdn);
        let fcrStatus;
        if (!jumlahMsisdn || jumlahMsisdn <= 10) {
          if (mappedData.detailCategory === '-' && mappedData.iot === '-') {
            fcrStatus = true;
          } else {
            const isFcrSatuan = fcrSatuanMap.get(compositeFcrKey) || false;
            fcrStatus = isFcrSatuan;
          }
        } else {
          const isFcrMassal = fcrMassalMap.get(compositeFcrKey) == 'FCR';
          fcrStatus = isFcrMassal;
        }

        let derivedProduct = kipMap.get(compositeFcrKey || '-');

        if (!derivedProduct) {
          if (/TC|Engineer/i.test(
            agentMap.get(mappedData.assignee?.trim().toLowerCase()) || '',
          )) {
            derivedProduct = 'SOLUTION';
            fcrStatus = true;
          } else {
            derivedProduct = 'CONNECTIVITY';
          }
        }

        const channel = determineChannel(mappedData, agentMap);
        if (channel === 'callcenter') {
          fcrStatus = false;
        }

        const rawNamaPerusahaan = mappedData.namaPerusahaan;
        const normalizedNamaPerusahaan =
          typeof rawNamaPerusahaan === 'string'
            ? rawNamaPerusahaan.trim().toLowerCase()
            : '';
        const derivedAccountCategory = accountMap.get(
          normalizedNamaPerusahaan || '',
        );

        const ticketSubject = mappedData.ticketSubject || '';
        const isVip = VIP_REGEX.test(ticketSubject);

        // --- RUN SLA CALCULATION ---
        // Now we pass the 'derivedProduct' as 'Kolom BF'
        const slaStatus = classification.isValid
          ? calculateSlaStatus({
              product: derivedProduct,
              ticketCreated: mappedData.ticketCreated,
              resolveTime: mappedData.resolveTime,
            })
          : false;

        const typeEskalasi = determineEskalasi({
          'ID Remedy_NO': mappedData.idRemedyNo,
          'Eskalasi/ID Remedy_IT/AO/EMS': mappedData.eskalasiId,
        });

        // D. Return Final Object
        return {
          ...mappedData,
          channel: channel,
          validationStatus: classification.status,
          statusTiket: classification.isValid,
          product: derivedProduct?.toUpperCase() || '-',
          sla: slaStatus,
          fcr: fcrStatus,
          eskalasi: typeEskalasi,
          isPareto: derivedAccountCategory === 'P1' ? true : false,
          isVip: isVip,
        };
      } catch (error) {
        this.logger.error(
          `Failed to process ticket ${baseTicket.ticket_id}`,
          error,
        );
        return null; // Return null so we can filter it out later
      }
    });

    // Wait for all API calls to finish
    const processedResults = await Promise.all(processPromises);

    // Filter out any failures (nulls)
    const validRows = processedResults.filter((row) => row !== null);

    // 3. Save as BATCH (Single Database Transaction)
    if (validRows.length > 0) {
      await this.ocaUpsertService.saveBatch(validRows);
      this.logger.log(`Successfully saved ${validRows.length} tickets.`);
    }
  }

  /**
   * Helper to look through activity logs and find the last known value
   * for fields that only appear in "changes"
   */
  private extractLatestCustomFields(activities: any[]) {
    // Default values
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

    // Sort activities oldest to newest to replay history correctly
    // (Assuming API returns newest first, so we reverse or iterate backwards)
    const sortedActivities = activities.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    for (const act of sortedActivities) {
      // 1. Safe extraction into a variable
      const changes = act.object?.additional_info?.changes;

      if (Array.isArray(changes)) {
        for (const change of changes) {
          // If this change is about a field we care about, update our state
          if (state.hasOwnProperty(change.name)) {
            state[change.name] = change.to;
          }
        }
      } else if (changes && typeof changes === 'object') {
        // Log it to see if we are missing data, or just ignore it
        //  console.warn('Found non-array changes:', changes);
      }
      if (act.object?.creator_info?.name) {
        state['Reporter'] = act.object.creator_info.name;
      }
    }
    return state;
  }

  private mapToDomainModel(baseData: any, customFields: any) {
    return {
      ticketNumber: baseData.ticket_number,
      ticketSubject: baseData.ticket_subject,
      channelOca: baseData.channel,
      category: customFields['category'],
      reporter: customFields['Reporter'],
      assignee: baseData.assigned_data?.name ?? '-',
      department: baseData.department_data?.name ?? '-',
      priority: baseData.priority,
      lastStatus: baseData.status,
      // status: baseData.status,

      ticketCreated: baseData.created_at,
      lastUpdate: baseData.updated_at,

      description: baseData.detail,
      customerName: baseData.client_name,
      customerPhone: baseData.phone_number,
      customerAddress: '-', //TODO: cari field address dari mana
      customerEmail: baseData.client_name,

      firstResponseTime: baseData.as_ticket?.first_executed_at ?? null,
      totalResponseTime: baseData.as_ticket?.resolved_at ?? '~', //TODO: hitung dari resolve - createdAt
      totalResolutionTime: baseData.as_ticket?.resolved_at ?? '-', //TODO: hitung dari resolve - createdAt
      resolveTime: baseData.as_ticket?.resolved_at ?? null,
      resolvedBy: 'agent', //TODO: kemungkinan besar agent
      closedTime: baseData.as_ticket?.resolved_at ?? null, //TODO: harus cari dari activity timestap pas closed
      ticketDuration: '-', //TODO: hitung

      countInboundMessage: 0, //TODO: cari tau dari mana
      lablInRoom: baseData.room, //TODO: baru dapat idRoom
      firstResponseDuration: '-', //TODO: hitung

      escalateTicket: baseData.escalation_to,
      lastAssigneeEscalation: '-',
      lastStatusEscalation: '-',
      lastUpdateEscalation: '-',

      converse: baseData.converse,
      moveToOtherChannel: 'No',
      previousChannel: '-',

      // amountRevenue: BigInt(customFields['Amount Revenue'] || 0),
      amountRevenue: ExcelUtils.parseSafeBigInt(
        customFields['Amount Revenue'] || 0,
      ),
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
}
