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
exports.CallUploadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
const excel_utils_helper_1 = require("../excel-utils.helper");
const fs = __importStar(require("fs"));
let CallUploadService = class CallUploadService {
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
        const kipMap = await this.createLookupMap(this.prisma.lookupKIP, 'compositeKey', 'product');
        const accountMap = await this.createLookupMap(this.prisma.accountMapping, 'corporateName', 'kategoriAccount');
        const batchSize = 1000;
        let rowsToInsert = [];
        const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
        for await (const worksheet of workbook) {
            for await (const row of worksheet) {
                if (row.number === 1)
                    continue;
                const rawNotes = row.getCell(17).text;
                const extractedData = this.extractNotesData(rawNotes);
                const rawNamaPerusahaan = extractedData.corp;
                const normalizedNamaPerusahaan = typeof rawNamaPerusahaan === 'string'
                    ? rawNamaPerusahaan.trim().toLowerCase()
                    : '';
                const derivedAccountCategory = accountMap.get(normalizedNamaPerusahaan || '');
                const compositeFcrKey = `${row.getCell(12).text}_${row.getCell(9).text}_${row.getCell(10).text}`
                    .trim()
                    .toLowerCase();
                let derivedProduct = kipMap.get(compositeFcrKey || '-');
                if (!derivedProduct) {
                    derivedProduct = 'CONNECTIVITY';
                }
                const rowData = {
                    kipId: row.getCell(1).text,
                    updateStamp: excel_utils_helper_1.ExcelUtils.parseExcelDate(row.getCell(2).value),
                    msisdn: row.getCell(3).text,
                    brand: row.getCell(4).text,
                    unitType: row.getCell(5).text,
                    unitName: row.getCell(6).text,
                    areaName: row.getCell(7).text,
                    regName: row.getCell(8).text,
                    topicReason1: row.getCell(9).text,
                    topicReason2: row.getCell(10).text,
                    topicResult: row.getCell(11).text,
                    service: row.getCell(12).text,
                    appId: row.getCell(13).text,
                    userId: row.getCell(14).text,
                    employeeCode: row.getCell(15).text,
                    employeeName: row.getCell(16).text,
                    notes: row.getCell(17).text,
                    corp: extractedData.corp,
                    projectId: extractedData.projectId,
                    tier: extractedData.tier,
                    customerType: extractedData.customerType,
                    validationStatus: 'valid',
                    statusTiket: true,
                    product: derivedProduct?.toUpperCase() || '-',
                    sla: true,
                    fcr: true,
                    isFcrRealisasi: true,
                    eskalasi: '-',
                    isPareto: derivedAccountCategory === 'P1' ? true : false,
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
        return { status: 'Raw Call Completed' };
    }
    async saveBatch(rows) {
        if (rows.length === 0)
            return;
        const uniqueRowsMap = new Map();
        for (const row of rows) {
            if (!row.kipId)
                continue;
            const uniqueKey = row.kipId;
            uniqueRowsMap.set(uniqueKey, row);
        }
        const cleanRows = Array.from(uniqueRowsMap.values());
        if (cleanRows.length === 0)
            return;
        const values = cleanRows
            .map((row) => {
            return `(
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.kipId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.updateStamp)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.msisdn)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.brand)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.unitType)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.unitName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.areaName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.regName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.topicReason1)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.topicReason2)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.topicResult)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.service)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.appId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.userId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.employeeCode)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.employeeName)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.notes)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.corp)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.projectId)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.tier)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.customerType)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.validationStatus)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.statusTiket)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.product)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.sla)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.fcr)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isFcrRealisasi)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.eskalasi)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isPareto)},
        ${excel_utils_helper_1.ExcelUtils.formatSqlValue(row.isVip)}
        )`;
        })
            .join(',');
        const query = `
        INSERT INTO "RawCall" (
        "kip_id", "update_stamp", "msisdn", "brand", "unit_type", "unit_name",
        "area_name", "reg_name", "topic_reason_1", "topic_reason_2",
        "topic_result", "service", "app_id", "user_id",
        "employee_code", "employee_name", "notes", "corp", "project_id",
        "tier", "customer_type", "validationStatus", "statusTiket",
        "product", "inSla", "isFcr", "isFcrRealisasi", "eskalasi", "isPareto", "isVip"
        )
        VALUES ${values}
        ON CONFLICT ("kip_id")
        DO UPDATE SET
        "update_stamp"    = EXCLUDED."update_stamp",
        "brand"           = EXCLUDED."brand",           
        "unit_type"       = EXCLUDED."unit_type",
        "unit_name"       = EXCLUDED."unit_name",
        "area_name"       = EXCLUDED."area_name",
        "reg_name"        = EXCLUDED."reg_name",
        "topic_reason_1"  = EXCLUDED."topic_reason_1",
        "topic_reason_2"  = EXCLUDED."topic_reason_2",
        "topic_result"    = EXCLUDED."topic_result",
        "service"         = EXCLUDED."service",
        "app_id"          = EXCLUDED."app_id",
        "user_id"         = EXCLUDED."user_id",
        "employee_code"   = EXCLUDED."employee_code",
        "employee_name"   = EXCLUDED."employee_name",
        "notes"           = EXCLUDED."notes",
        "corp"            = EXCLUDED."corp",
        "project_id"      = EXCLUDED."project_id",
        "tier"            = EXCLUDED."tier",
        "customer_type"   = EXCLUDED."customer_type",
        "validationStatus"= EXCLUDED."validationStatus",
        "statusTiket"     = EXCLUDED."statusTiket",
        "product"         = EXCLUDED."product",
        "inSla"           = EXCLUDED."inSla",
        "isFcr"           = EXCLUDED."isFcr",
        "isFcrRealisasi"  = EXCLUDED."isFcrRealisasi",
        "eskalasi"        = EXCLUDED."eskalasi",
        "isPareto"        = EXCLUDED."isPareto",
        "isVip"           = EXCLUDED."isVip";
    `;
        await this.prisma.$executeRawUnsafe(query);
    }
    extractNotesData(notes) {
        const cleanNotes = notes || '';
        const corpMatch = cleanNotes.match(/Corp\s*:\s*(.*)/i);
        const companyMatch = cleanNotes.match(/Nama\s*Perusahaan\s*:\s*(.*)/i);
        let corp = '';
        if (corpMatch) {
            corp = corpMatch[1].trim();
        }
        else if (companyMatch) {
            corp = companyMatch[1].trim();
        }
        if (corp && /Project\s*ID/i.test(corp)) {
            corp = '';
        }
        const projectIdMatch = cleanNotes.match(/Project\s*ID\s*:\s*(.*)/i);
        const projectId = projectIdMatch ? projectIdMatch[1].trim() : null;
        const allTags = (cleanNotes.match(/\[(.*?)\]/g) || []).map((tag) => tag
            .replace(/[\[\]]/g, '')
            .toUpperCase()
            .trim());
        const knownTiers = ['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
        const tier = allTags.find((t) => knownTiers.includes(t)) || null;
        let customerType = '';
        if (allTags.includes('CORP'))
            customerType = 'CORP';
        else if (allTags.includes('REGULAR'))
            customerType = 'REGULAR';
        if (!customerType && corp)
            customerType = 'CORP';
        return {
            corp,
            projectId,
            tier,
            customerType,
        };
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
};
exports.CallUploadService = CallUploadService;
exports.CallUploadService = CallUploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CallUploadService);
//# sourceMappingURL=call-upload.service.js.map