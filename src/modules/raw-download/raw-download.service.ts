import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

type ExportType = 'omnix' | 'oca' | 'call' | 'news-log';

type DownloadDateRangeQuery = {
  startDate?: string;
  endDate?: string;
};

type DateRange = {
  startDate?: Date;
  endDate?: Date;
};

const EXCLUDED_COLUMNS = new Set([
  'id',
  'eskalasi',
  'inSla',
  'isFcr',
  'isPareto',
  'isVip',
  'product',
  'statusTiket',
  'validationStatus',
  'channel',
  'channelName',
  'corp',
  'projectId',
  'tier',
  'customerType',
]);

@Injectable()
export class RawDownloadService {
  private static readonly JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async generateWorkbookBuffer(type: ExportType, dateRangeQuery?: DownloadDateRangeQuery): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(this.getSheetName(type));
    const dateRange = this.parseDateRange(dateRangeQuery);

    const pageSize = 1000;
    let page = 0;
    let hasWrittenHeader = false;
    let headers: string[] = [];

    while (true) {
      const rows = await this.getRows(type, page * pageSize, pageSize, dateRange);
      if (!rows.length) break;

      for (const row of rows) {
        const formattedRow = this.omitExcludedColumns(row, type);

        if (!hasWrittenHeader) {
          headers = Object.keys(formattedRow);
          worksheet.columns = headers.map((header) => ({
            header,
            key: header,
            width: 24,
          }));
          hasWrittenHeader = true;
        }

        if (headers.length) {
          worksheet.addRow(headers.map((header) => formattedRow[header] ?? null));
        }
      }

      if (rows.length < pageSize) break;
      page += 1;
    }

    if (!hasWrittenHeader) {
      worksheet.columns = [{ header: 'message', key: 'message', width: 40 }];
      worksheet.addRow(['No data available']);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  getFileName(type: ExportType): string {
    const timestamp = this.formatDateToJakarta(new Date()).replace(/[: ]/g, '-');
    return `raw-${type}-${timestamp}.xlsx`;
  }

  private getSheetName(type: ExportType): string {
    if (type === 'omnix') return 'RawOmnix';
    if (type === 'oca') return 'RawOca';
    if (type === 'news-log') return 'NewsLog';
    return 'RawCall';
  }

  private async getRows(type: ExportType, skip: number, take: number, dateRange: DateRange) {
    console.log(`Fetching ${type} data with skip=${skip}, take=${take}, dateRange=${JSON.stringify(dateRange)}`);
    
    if (type === 'news-log') {
      return this.getNewsLogRows(dateRange, skip, take);
    }
    
    const where = this.buildWhereByType(type, dateRange);

    if (type === 'omnix') {
      return this.prisma.rawOmnix.findMany({ where, orderBy: { id: 'asc' }, skip, take });
    }

    if (type === 'oca') {
      return this.prisma.rawOca.findMany({ where, orderBy: { id: 'asc' }, skip, take });
    }

    return this.prisma.rawCall.findMany({
      where,
      orderBy: { id: 'asc' },
      skip,
      take,
      select: {
        kipId: true,
        appId: true,
        areaName: true,
        brand: true,
        employeeCode: true,
        employeeName: true,
        msisdn: true,
        notes: true,
        regName: true,
        service: true,
        topicReason1: true,
        topicReason2: true,
        topicResult: true,
        unitName: true,
        unitType: true,
        updateStamp: true,
        userId: true,
        isFcrRealisasi: true,
      },
    });
  }

  private async getNewsLogRows(dateRange: DateRange, skip: number, take: number) {
    const { startDate, endDate } = dateRange;
    
    let startDateParam = startDate || new Date(0);
    let endDateParam = endDate || new Date('9999-12-31T23:59:59.999Z');

    const result: any[] = await this.prisma.$queryRaw`
      SELECT 
          category AS "Kategori",
          title AS "Nama Artikel",
          COALESCE("authorName", 'Sistem / Tidak Diketahui') AS "User",
          "Action" AS "Action",
          TO_CHAR(waktu_aksi, 'DD/MM/YYYY HH24:MI:SS') AS "dd/mm/yyyy hh:mm:ss"
      FROM (
          SELECT 
              n.title,
              n.category,
              n."authorName",
              'CREATE' AS "Action",
              n."createdAt" AS waktu_aksi
          FROM "News" n
          WHERE n."createdAt" >= ${startDateParam}
            AND n."createdAt" <= ${endDateParam}
          
          UNION ALL
          
          SELECT 
              n.title,
              n.category,
              n."authorName",
              'LAST UPDATE' AS "Action",
              n."updatedAt" AS waktu_aksi
          FROM "News" n
          WHERE n."updatedAt" >= ${startDateParam}
            AND n."updatedAt" <= ${endDateParam}
            AND n."updatedAt" > n."createdAt"
      ) data_gabungan
      ORDER BY waktu_aksi DESC
      LIMIT ${take} OFFSET ${skip}
    `;
    
    return result;
  }

  private parseDateRange(dateRangeQuery?: DownloadDateRangeQuery): DateRange {
    const startDate = this.parseDateInput(dateRangeQuery?.startDate, 'startDate');
    const endDate = this.parseDateInput(dateRangeQuery?.endDate, 'endDate', true);

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('startDate cannot be greater than endDate');
    }

    return { startDate, endDate };
  }

  private parseDateInput(raw: string | undefined, fieldName: 'startDate' | 'endDate', isEnd = false): Date | undefined {
    if (!raw) {
      return undefined;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const suffix = isEnd ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
      const parsedDate = new Date(`${trimmed}${suffix}`);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException(`Invalid ${fieldName}. Use YYYY-MM-DD or ISO datetime`);
      }
      return parsedDate;
    }

    const parsedDate = new Date(trimmed);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}. Use YYYY-MM-DD or ISO datetime`);
    }

    return parsedDate;
  }

  private buildWhereByType(type: ExportType, dateRange: DateRange) {
    const dateFilter = this.buildDateFilter(dateRange);
    if (!dateFilter) {
      return undefined;
    }

    if (type === 'omnix') {
      return { dateStartInteraction: dateFilter } satisfies Prisma.RawOmnixWhereInput;
    }

    if (type === 'oca') {
      return { ticketCreated: dateFilter } satisfies Prisma.RawOcaWhereInput;
    }

    return { updateStamp: dateFilter } satisfies Prisma.RawCallWhereInput;
  }

  private buildDateFilter(dateRange: DateRange): Prisma.DateTimeNullableFilter | undefined {
    const { startDate, endDate } = dateRange;
    if (!startDate && !endDate) {
      return undefined;
    }

    return {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  private omitExcludedColumns(row: Record<string, unknown>, type?: ExportType): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (type === 'call') {
      const callColumnOrder = [
        'kipId',
        'appId',
        'areaName',
        'brand',
        'employeeCode',
        'employeeName',
        'msisdn',
        'notes',
        'regName',
        'service',
        'topicReason1',
        'topicReason2',
        'topicResult',
        'unitName',
        'unitType',
        'updateStamp',
        'userId',
        'isFcrRealisasi',
      ];
      for (const col of callColumnOrder) {
        if (col in row && !EXCLUDED_COLUMNS.has(col)) {
          result[col] = this.normalizeCellValue(row[col]);
        }
      }
      for (const [key, value] of Object.entries(row)) {
        if (!callColumnOrder.includes(key) && !EXCLUDED_COLUMNS.has(key)) {
          result[key] = this.normalizeCellValue(value);
        }
      }
    } else {
      for (const [key, value] of Object.entries(row)) {
        if (!EXCLUDED_COLUMNS.has(key)) {
          result[key] = this.normalizeCellValue(value);
        }
      }
    }

    return result;
  }

  private normalizeCellValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return this.formatDateToJakarta(value);
    }

    if (Array.isArray(value) || typeof value === 'object') {
      return JSON.stringify(value, (_key, nestedValue) =>
        typeof nestedValue === 'bigint'
          ? nestedValue.toString()
          : nestedValue instanceof Date
            ? this.formatDateToJakarta(nestedValue)
            : nestedValue,
      );
    }

    return value;
  }

  private formatDateToJakarta(date: Date): string {
    const jakartaDate = new Date(date.getTime() + RawDownloadService.JAKARTA_OFFSET_MS);
    const year = jakartaDate.getUTCFullYear();
    const month = String(jakartaDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jakartaDate.getUTCDate()).padStart(2, '0');
    const hour = String(jakartaDate.getUTCHours()).padStart(2, '0');
    const minute = String(jakartaDate.getUTCMinutes()).padStart(2, '0');
    const second = String(jakartaDate.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
}
