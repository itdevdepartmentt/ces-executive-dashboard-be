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
var RawDownloadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawDownloadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
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
let RawDownloadService = class RawDownloadService {
    static { RawDownloadService_1 = this; }
    prisma;
    static JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateWorkbookBuffer(type, dateRangeQuery) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(this.getSheetName(type));
        const dateRange = this.parseDateRange(dateRangeQuery);
        const pageSize = 1000;
        let page = 0;
        let hasWrittenHeader = false;
        let headers = [];
        let globalRowNumber = 1;
        while (true) {
            const rows = await this.getRows(type, page * pageSize, pageSize, dateRange);
            if (!rows.length)
                break;
            for (const row of rows) {
                if (type === 'news-log') {
                    row['No'] = globalRowNumber++;
                }
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
            if (rows.length < pageSize)
                break;
            page += 1;
        }
        if (!hasWrittenHeader) {
            worksheet.columns = [{ header: 'message', key: 'message', width: 40 }];
            worksheet.addRow(['No data available']);
        }
        return Buffer.from(await workbook.xlsx.writeBuffer());
    }
    getFileName(type) {
        const timestamp = this.formatDateToJakarta(new Date()).replace(/[: ]/g, '-');
        return `raw-${type}-${timestamp}.xlsx`;
    }
    getSheetName(type) {
        if (type === 'omnix')
            return 'RawOmnix';
        if (type === 'oca')
            return 'RawOca';
        if (type === 'news-log')
            return 'NewsLog';
        return 'RawCall';
    }
    async getRows(type, skip, take, dateRange) {
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
    async getNewsLogRows(dateRange, skip, take) {
        const { startDate, endDate } = dateRange;
        let startDateParam = startDate || new Date(0);
        let endDateParam = endDate || new Date('9999-12-31T23:59:59.999Z');
        const result = await this.prisma.$queryRaw `
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
    parseDateRange(dateRangeQuery) {
        const startDate = this.parseDateInput(dateRangeQuery?.startDate, 'startDate');
        const endDate = this.parseDateInput(dateRangeQuery?.endDate, 'endDate', true);
        if (startDate && endDate && startDate > endDate) {
            throw new common_1.BadRequestException('startDate cannot be greater than endDate');
        }
        return { startDate, endDate };
    }
    parseDateInput(raw, fieldName, isEnd = false) {
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
                throw new common_1.BadRequestException(`Invalid ${fieldName}. Use YYYY-MM-DD or ISO datetime`);
            }
            return parsedDate;
        }
        const parsedDate = new Date(trimmed);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new common_1.BadRequestException(`Invalid ${fieldName}. Use YYYY-MM-DD or ISO datetime`);
        }
        return parsedDate;
    }
    buildWhereByType(type, dateRange) {
        const dateFilter = this.buildDateFilter(dateRange);
        if (!dateFilter) {
            return undefined;
        }
        if (type === 'omnix') {
            return { dateStartInteraction: dateFilter };
        }
        if (type === 'oca') {
            return { ticketCreated: dateFilter };
        }
        return { updateStamp: dateFilter };
    }
    buildDateFilter(dateRange) {
        const { startDate, endDate } = dateRange;
        if (!startDate && !endDate) {
            return undefined;
        }
        return {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
        };
    }
    omitExcludedColumns(row, type) {
        const result = {};
        if (type === 'call') {
            const callColumnMap = [
                ['kipId', 'kipId'],
                ['updateStamp', 'updateStamp'],
                ['msisdn', 'msisdn'],
                ['brand', 'brand'],
                ['unitType', 'unitType'],
                ['unitName', 'unitName'],
                ['areaName', 'areaName'],
                ['regName', 'regName'],
                ['topicReason1', 'topicReason1'],
                ['topicReason2', 'topicReason2'],
                ['topicResult', 'topicResult'],
                ['service', 'service'],
                ['appId', 'appId'],
                ['userId', 'userId'],
                ['employeeCode', 'employeeCode'],
                ['employeeName', 'employeeName'],
                ['notes', 'notes'],
                ['isFcrRealisasi', 'isFirstCallRealisasi'],
            ];
            for (const [dbKey, excelKey] of callColumnMap) {
                result[excelKey] = dbKey in row ? this.normalizeCellValue(row[dbKey]) : null;
            }
        }
        else {
            for (const [key, value] of Object.entries(row)) {
                if (!EXCLUDED_COLUMNS.has(key)) {
                    result[key] = this.normalizeCellValue(value);
                }
            }
        }
        return result;
    }
    normalizeCellValue(value) {
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
            return JSON.stringify(value, (_key, nestedValue) => typeof nestedValue === 'bigint'
                ? nestedValue.toString()
                : nestedValue instanceof Date
                    ? this.formatDateToJakarta(nestedValue)
                    : nestedValue);
        }
        return value;
    }
    formatDateToJakarta(date) {
        const jakartaDate = new Date(date.getTime() + RawDownloadService_1.JAKARTA_OFFSET_MS);
        const year = jakartaDate.getUTCFullYear();
        const month = String(jakartaDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(jakartaDate.getUTCDate()).padStart(2, '0');
        const hour = String(jakartaDate.getUTCHours()).padStart(2, '0');
        const minute = String(jakartaDate.getUTCMinutes()).padStart(2, '0');
        const second = String(jakartaDate.getUTCSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }
};
exports.RawDownloadService = RawDownloadService;
exports.RawDownloadService = RawDownloadService = RawDownloadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RawDownloadService);
//# sourceMappingURL=raw-download.service.js.map