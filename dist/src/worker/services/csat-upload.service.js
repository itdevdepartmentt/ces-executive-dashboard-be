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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsatUploadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
const excel_utils_helper_1 = require("../excel-utils.helper");
const fs = __importStar(require("fs"));
let CsatUploadService = class CsatUploadService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async process(job) {
        const filePath = job.data.path;
        if (!fs.existsSync(filePath)) {
            console.error(`File missing at path: ${filePath}`);
            throw new Error(`File not found: ${filePath} - likely a stale job.`);
        }
        const batchSize = 1000;
        let rowsToInsert = [];
        const affectedDates = new Set();
        const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
        for await (const worksheet of workbook) {
            for await (const row of worksheet) {
                if (row.number === 1)
                    continue;
                const createdAtRaw = row.getCell(2).value;
                const answeredAtRaw = row.getCell(4).value;
                const scoreRaw = row.getCell(9).value;
                if (createdAtRaw) {
                    const parsedDate = excel_utils_helper_1.ExcelUtils.parseExcelDate(createdAtRaw);
                    if (parsedDate) {
                        const dateString = parsedDate.toISOString().split('T')[0];
                        affectedDates.add(dateString);
                    }
                }
                const rowData = {
                    createdAt: excel_utils_helper_1.ExcelUtils.parseExcelDate(createdAtRaw),
                    status: row.getCell(3).text,
                    answeredAt: answeredAtRaw
                        ? excel_utils_helper_1.ExcelUtils.parseExcelDate(answeredAtRaw)
                        : null,
                    customer: row.getCell(5).text,
                    ticketNumbers: row.getCell(6).text,
                    interactionId: row.getCell(7).text,
                    question1: row.getCell(8).text,
                    numeric: scoreRaw ? parseInt(scoreRaw.toString()) : null,
                    question2: row.getCell(10).text,
                    question3: row.getCell(11).text,
                    question4: row.getCell(12).text,
                    question5: row.getCell(13).text,
                    question6: row.getCell(14).text,
                    channel: row.getCell(15).text,
                    assignedAgent: row.getCell(16).text,
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
        const uniqueDates = Array.from(affectedDates).map((d) => new Date(d));
        await this.refreshDailyStats(uniqueDates);
        return { status: 'Completed' };
    }
    async saveBatch(rows) {
        if (rows.length === 0)
            return;
        const uniqueRowsMap = new Map();
        const internalDuplicates = [];
        for (const row of rows) {
            const uniqueKey = `${row.createdAt.toISOString()}_${row.customer}`;
            if (uniqueRowsMap.has(uniqueKey)) {
                internalDuplicates.push({
                    customer: row.customer,
                    date: row.createdAt,
                    reason: 'Duplicate found inside the same Excel batch',
                });
            }
            else {
                uniqueRowsMap.set(uniqueKey, row);
            }
        }
        if (internalDuplicates.length > 0) {
            console.log('internal Duplicates Skipped:', internalDuplicates);
        }
        const cleanRows = Array.from(uniqueRowsMap.values());
        const values = cleanRows
            .map((row) => {
            return `(
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.createdAt)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customer)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.status)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.answeredAt)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.ticketNumbers)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.interactionId)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.question1)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.numeric)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.question2)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.question3)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.question4)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.question5)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.question6)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.channel)},
          ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.assignedAgent)}
        )`;
        })
            .join(',');
        const query = `
      INSERT INTO "RawCsat" (
        "createdAt", "customer", "status", "answeredAt", 
        "ticketNumbers", "interactionId", "question1", "numeric", 
        "question2", "question3", "question4", "question5", 
        "question6", "channel", "assignedAgent"
      )
      VALUES ${values}
      ON CONFLICT ("createdAt", "customer") 
      DO UPDATE SET 
        "status"        = EXCLUDED."status",
        "answeredAt"    = EXCLUDED."answeredAt",
        "ticketNumbers" = EXCLUDED."ticketNumbers",
        "interactionId" = EXCLUDED."interactionId",
        "question1"     = EXCLUDED."question1",
        "numeric"       = EXCLUDED."numeric",
        "question2"     = EXCLUDED."question2",
        "question3"     = EXCLUDED."question3",
        "question4"     = EXCLUDED."question4",
        "question5"     = EXCLUDED."question5",
        "question6"     = EXCLUDED."question6",
        "channel"       = EXCLUDED."channel",
        "assignedAgent" = EXCLUDED."assignedAgent";
    `;
        await this.prisma.$executeRawUnsafe(query);
    }
    async refreshDailyStats(targetDates) {
        if (targetDates.length === 0)
            return;
        const dateStrings = targetDates
            .map((d) => `'${d.toISOString().split('T')[0]}'`)
            .join(', ');
        const query = `
        INSERT INTO "DailyCsatStat" (
            "date", 
            "totalSurvey", 
            "totalDijawab", 
            "totalJawaban45", 
            "scoreCsat", 
            "persenCsat"
        )
        WITH DailyAggregates AS (
        SELECT 
            DATE("createdAt") as date,
            COUNT(*) as totalSurvey,
            COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END) as totalDijawab,
            COUNT(CASE WHEN "numeric" >= 4 THEN 1 END) as totalJawaban45
        FROM "RawCsat"
        
        -- Only look at the dates we just inserted/updated
        WHERE DATE("createdAt") IN (${dateStrings}) 
        
        GROUP BY DATE("createdAt")
        ),
        WithPercentage AS (
            SELECT 
            *,
            CASE 
                WHEN totalDijawab = 0 THEN 0
                ELSE (CAST(totalJawaban45 AS FLOAT) / CAST(totalDijawab AS FLOAT)) * 100
            END as calculated_persen
            FROM DailyAggregates
        )
        SELECT 
            date,
            totalSurvey,
            totalDijawab,
            totalJawaban45,
            
            -- 1. Calculate Score from Percentage * 5
            ((calculated_persen/100) * 5) as scoreCsat,
            
            -- 2. The Percentage itself
            calculated_persen as persenCsat

        FROM WithPercentage
        ON CONFLICT ("date") 
        DO UPDATE SET 
            "totalSurvey" = EXCLUDED."totalSurvey",
            "totalDijawab" = EXCLUDED."totalDijawab",
            "totalJawaban45" = EXCLUDED."totalJawaban45",
            "scoreCsat" = EXCLUDED."scoreCsat",
            "persenCsat" = EXCLUDED."persenCsat";
    `;
        await this.prisma.$executeRawUnsafe(query);
    }
};
exports.CsatUploadService = CsatUploadService;
exports.CsatUploadService = CsatUploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CsatUploadService);
//# sourceMappingURL=csat-upload.service.js.map