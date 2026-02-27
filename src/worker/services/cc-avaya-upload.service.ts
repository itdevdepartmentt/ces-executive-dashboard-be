import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { ExcelUtils } from '../excel-utils.helper';
import * as fs from 'fs';
import csv from 'csv-parser';

@Injectable()
export class CcAvayaUploadService {
  constructor(private readonly prisma: PrismaService) {}

  async process(job: Job) {
    const filePath = job.data.path;
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const separator = this.detectDelimiter(filePath);

    // Create a stream that pipes the file through the CSV parser
    const stream = fs.createReadStream(filePath).pipe(
      csv({
        separator,
        mapHeaders: ({ header }) => header.replace(/^"+|"+$/g, '').trim(), // Safely trim whitespace/BOM from headers
      }),
    );

    const batchSize = 1000;
    let rowsToInsert: any[] = [];

    let skipSecondRow = true;

    for await (const row of stream) {
      if (skipSecondRow) {
        skipSecondRow = false;
        continue; // skip row 2
      }
      const numberCalls = parseInt(row['ACD Calls']) || 0;

      for (let i = 0; i < numberCalls; i++) {
        const updateStamp = ExcelUtils.parseExcelDate(
          `${row['Date']} ${row['Time']}`,
        );
        const rowData = {
          date: ExcelUtils.parseExcelDate(row['Date']),
          time: row['Time'],
          sequence: i + 1,
          callsoffered: parseInt(row['Callsoffered']) || 0,
          acdCalls: parseInt(row['ACD Calls']) || 0,
          abanCalls: parseInt(row['Aban Calls']) || 0,
          updateStamp: updateStamp,
          unitType: 'callcenter',
          corp: '-',
          topicReason2: '-',

          // row tambahan
          validationStatus: 'valid',
          statusTiket: true,
          product: '-',
          sla: true,
          fcr: true,
          eskalasi: '-',
          isPareto: true,
          isVip: false,
        };

        rowsToInsert.push(rowData);

        if (rowsToInsert.length >= batchSize) {
          await this.saveBatch(rowsToInsert);
          rowsToInsert = [];
        }
      }
    }

    if (rowsToInsert.length > 0) {
      await this.saveBatch(rowsToInsert);
    }

    return { status: 'Call Metrics Upload Completed' };
  }

  private async saveBatch(rows: any[]) {
    if (rows.length === 0) return;

    // 2. BUILD SQL VALUES
    const values = rows
      .map((row) => {
        return `(
                ${ExcelUtils.formatSqlValue(row.date)},
                ${ExcelUtils.formatSqlValue(row.time)},
                ${ExcelUtils.formatSqlValue(row.sequence)},
                ${ExcelUtils.formatSqlValue(row.callsoffered)},
                ${ExcelUtils.formatSqlValue(row.acdCalls)},
                ${ExcelUtils.formatSqlValue(row.abanCalls)},
                ${ExcelUtils.formatSqlValue(row.updateStamp)},
                ${ExcelUtils.formatSqlValue(row.unitType)},
                ${ExcelUtils.formatSqlValue(row.corp)},
                ${ExcelUtils.formatSqlValue(row.topicReason2)},

                ${ExcelUtils.formatSqlValue(row.validationStatus)},
                ${ExcelUtils.formatSqlValue(row.statusTiket)},
                ${ExcelUtils.formatSqlValue(row.product)},
                ${ExcelUtils.formatSqlValue(row.sla)},
                ${ExcelUtils.formatSqlValue(row.fcr)},
                ${ExcelUtils.formatSqlValue(row.eskalasi)},
                ${ExcelUtils.formatSqlValue(row.isPareto)},
                ${ExcelUtils.formatSqlValue(row.isVip)}
            )`;
      })
      .join(',');

    // console.log(values);

    // 3. EXECUTE UPSERT (Mapping to the snake_case names in DB)
    const query = `
            INSERT INTO "raw_cc" (
                "date", "time", "sequence", "callsoffered", "acd_calls", "aban_calls", 
                "update_stamp", "unit_type", "corp", "topic_reason_2",
                "validationStatus", "statusTiket",
                "product", "inSla", "isFcr", "eskalasi", "isPareto", "isVip"
            )
            VALUES ${values}
            ON CONFLICT ("date", "time", "sequence")
            DO UPDATE SET
                "update_stamp"      = EXCLUDED."update_stamp",
                "unit_type"         = EXCLUDED."unit_type",
                "corp"              = EXCLUDED."corp",
                "topic_reason_2"     = EXCLUDED."topic_reason_2",
                "validationStatus"= EXCLUDED."validationStatus",
                "statusTiket"     = EXCLUDED."statusTiket",
                "product"         = EXCLUDED."product",
                "inSla"           = EXCLUDED."inSla",
                "isFcr"           = EXCLUDED."isFcr",
                "eskalasi"        = EXCLUDED."eskalasi",
                "isPareto"        = EXCLUDED."isPareto",
                "isVip"           = EXCLUDED."isVip";
            ;
        `;

    await this.prisma.$executeRawUnsafe(query);
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
