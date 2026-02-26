/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Job } from 'bullmq';
import csv from 'csv-parser';
import * as fs from 'fs';
import { ExcelUtils } from '../excel-utils.helper';
import { calculateSlaStatus, determineEskalasi } from '../utils/rules.constant';
import { OcaUpsertService } from '../repository/oca-upsert.service';
import {
  classifyTicket,
  createLookupMap,
  determineChannel,
  VIP_REGEX,
} from '../utils/oca-ticket.utils';

@Injectable()
export class OcaUploadService {
  private readonly logger = new Logger(OcaUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ocaUpsertService: OcaUpsertService,
  ) {}

  async process(job: Job) {
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

    const filePath = job.data.path;
    if (!fs.existsSync(filePath)) {
      console.error(`File missing at path: ${filePath}`);
      // Throwing an error here marks the job as FAILED in BullMQ,
      // but it won't crash your entire Node.js server.
      throw new Error(`File not found: ${filePath} - likely a stale job.`);
    }

    const batchSize = 1000;
    let rowsToInsert: any[] = [];

    const separator = this.detectDelimiter(filePath);

    // Create a stream that pipes the file through the CSV parser
    const stream = fs.createReadStream(filePath).pipe(
      csv({
        separator,
        mapHeaders: ({ header }) => header.replace(/^"+|"+$/g, '').trim(), // Safely trim whitespace/BOM from headers
      }),
    );

    // Async Iterator: This reads the CSV line by line without loading it all into RAM

    this.logger.log(`Starting Oca CSV Batch Upload Service`);
    for await (const row of stream) {
      const normalizedRow = {
        customerEmail: row['Customer Email'],
        ticketSubject: row['Ticket Subject'],
        department: row['Department'],
        subCategory: row['Sub Category'],
        assignee: row['Assignee'],
        description: row['Description'],
        detailCategory: row['Detail Category'],
        channelOca: row['Channel'],
      };
      const classification = classifyTicket(normalizedRow);

      const rawNamaPerusahaan = row['Nama Perusahaan'];
      const normalizedNamaPerusahaan =
        typeof rawNamaPerusahaan === 'string'
          ? rawNamaPerusahaan.trim().toLowerCase()
          : '';
      const derivedAccountCategory = accountMap.get(
        normalizedNamaPerusahaan || '',
      );

      const ticketSubject = row['Ticket Subject'] || '';
      const isVip = VIP_REGEX.test(ticketSubject);

      const compositeFcrKey =
        `${row['Category'].trim()}_${row['Sub Category'].trim()}_${row['Detail Category'].trim()}_${row['IOT'].trim()}`
          .trim()
          .toLowerCase();

      const jumlahMsisdn = ExcelUtils.parseSafeInt(row['Jumlah MSISDN']);
      let fcrStatus;
      if (!jumlahMsisdn || jumlahMsisdn <= 10) {
        if (row['Detail Category'] === '-' && row['IOT'] === '-') {
          fcrStatus = true;
              if (row['Ticket Number'] === 'TICKET-2228486') {
        this.logger.debug(`Debugging Ticket TICKET-2228486: -`);
      }
        } else {
          const isFcrSatuan = fcrSatuanMap.get(compositeFcrKey) || false;
          // this.logger.debug(`FCR Satuan Check :${fcrSatuanMap.get(compositeFcrKey)} calculated: ${isFcrSatuan}`);
          fcrStatus = isFcrSatuan;
                       if (row['Ticket Number'] === 'TICKET-2228486') {
        this.logger.debug(`Debugging Ticket TICKET-2228486: fcr satuan`);
      }
        }
      } else {
        const isFcrMassal = fcrMassalMap.get(compositeFcrKey) == 'FCR' ? true : false;
        // this.logger.debug(`FCR Massal Check :${fcrMassalMap.get(compositeFcrKey)} calculated: ${isFcrMassal}`);
        fcrStatus = isFcrMassal;
                               if (row['Ticket Number'] === 'TICKET-2228486') {
        this.logger.debug(`Debugging Ticket TICKET-2228486: fcr massal`);
      }
      }

      if (row['Ticket Number'] === 'TICKET-2228486') {
        this.logger.debug(`Debugging Ticket TICKET-2228486: compositeFcrKey=${compositeFcrKey}, jumlahMsisdn=${jumlahMsisdn}, fcrStatus=${fcrStatus}`);
      }
      
      // let fcrStatus = fcrMap.get(compositeFcrKey) || false;

      let derivedProduct = kipMap.get(compositeFcrKey || '-');

      if (!derivedProduct && /TC|Engineer/i.test(agentMap.get(row['Assignee'].trim().toLowerCase()) || '')) {
        this.logger.debug(`Applying fallback product logic for Ticket ${row['Ticket Number']} due to missing KIP mapping`);
        derivedProduct = 'SOLUTION';
        fcrStatus = true;
      //                          if (row['Ticket Number'] === 'TICKET-2228486') {
      //   this.logger.debug(`Debugging Ticket TICKET-2228486: masuk ke fallback product logic karena tidak ditemukan di KIP Map`);
      // }
      //   if(/iot/i.test(row['Sub Category']) &&
      //   /ENGINEER|TECHNICAL TEAM/i.test(row['Department'])) {
      //     derivedProduct = 'SOLUTION';
      //     // fcrStatus = false;
      //   } else {
      //     derivedProduct = 'CONNECTIVITY';
      //     fcrStatus = true;
      //   }

      }

      const channel = determineChannel(
        {
          department: row['Department'],
          channelOca: row['Channel'],
          ticketSubject: row['Ticket Subject'],
          assignee: row['Assignee'],
        },
        agentMap,
      );

      if (channel === 'callcenter') {
        fcrStatus = false;
      }

      // --- RUN SLA CALCULATION ---
      const slaStatus = calculateSlaStatus({
        product: derivedProduct,
        ticketCreated: row['Ticket Created'],
        resolveTime: row['Resolve Time'],
      });

      const typeEskalasi = determineEskalasi({
        'ID Remedy_NO': row['ID Remedy_NO'],
        'Eskalasi/ID Remedy_IT/AO/EMS': row['Eskalasi/ID Remedy_IT/AO/EMS'],
      });

      const rowData = {
        // EXACT header string from CSV
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

        // Date Parsing
        ticketCreated: ExcelUtils.parseExcelDate(row['Ticket Created']),
        lastUpdate: ExcelUtils.parseExcelDate(row['Last Update']),

        description: row['Description'],
        customerName: row['Customer Name'],
        customerPhone: row['Customer Phone'],
        customerAddress: row['Customer Address'],
        customerEmail: row['Customer Email'],

        firstResponseTime: ExcelUtils.parseExcelDate(
          row['First Response Time'],
        ),
        totalResponseTime: row['Total Response Time'],
        totalResolutionTime: row['Total Resolution Time'],
        resolveTime: ExcelUtils.parseExcelDate(row['Resolve Time']),
        resolvedBy: row['Resolved By'],
        closedTime: ExcelUtils.parseExcelDate(row['Closed Time']),
        ticketDuration: row['Ticket Duration'],

        // Number Parsing
        countInboundMessage: ExcelUtils.parseSafeInt(
          row['Count Inbound Message'],
        ),
        labelInRoom: row['Label In Room'],
        firstResponseDuration: row['First Response Duration'],

        escalateTicket: row['Escalate Ticket'],
        lastAssigneeEscalation: row['Last Assignee Escalation'],
        lastStatusEscalation: row['Last Status Escalation'],
        lastUpdateEscalation: row['Last Update Escalation'],

        converse: row['Converse'],
        moveToOtherChannel: row['Move to other channel'],
        previousChannel: row['Previous channel'],

        amountRevenue: ExcelUtils.parseSafeBigInt(row['Amount Revenue']),
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

        // row tambahan
        validationStatus: classification.status,
        statusTiket: classification.isValid,
        product: derivedProduct?.toUpperCase() || '-',
        sla: slaStatus,
        fcr: fcrStatus,
        eskalasi: typeEskalasi,
        isPareto: derivedAccountCategory === 'P1' ? true : false,
        isVip: isVip,

        updatedAtExcel: ExcelUtils.parseExcelDate(row['Updated at']),
      };

      rowsToInsert.push(rowData);

      // If batch is full, pause stream, save to DB, then resume
      if (rowsToInsert.length >= batchSize) {
        await this.ocaUpsertService.saveBatch(rowsToInsert);
        rowsToInsert = [];
      }
    }

    // Save remaining rows
    if (rowsToInsert.length > 0) {
      await this.ocaUpsertService.saveBatch(rowsToInsert);
    }
    this.logger.log(`Oca CSV Batch Upload Service Completed`);
    return { status: 'CSV Ticket Report Completed' };
  }

  detectDelimiter(filePath) {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024); // enough to read header line
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    const firstLine = buffer.toString('utf8').split('\n')[0];

    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    return semicolonCount > commaCount ? ';' : ',';
  }
}
