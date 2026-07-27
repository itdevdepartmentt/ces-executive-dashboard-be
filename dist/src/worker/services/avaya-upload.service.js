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
exports.AvayaUploadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
const excel_utils_helper_1 = require("../excel-utils.helper");
const fs = __importStar(require("fs"));
let AvayaUploadService = class AvayaUploadService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async process(job) {
        const filePath = job.data.path;
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const batchSize = 1000;
        let rowsToInsert = [];
        const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
        for await (const worksheet of workbook) {
            for await (const row of worksheet) {
                if (row.number === 1 || row.number === 2)
                    continue;
                const parseNum = (val) => {
                    if (val === null || val === undefined)
                        return 0;
                    const clean = val.toString().replace(',', '.');
                    return parseFloat(clean) || 0;
                };
                const rowData = {
                    date: excel_utils_helper_1.ExcelUtils.parseExcelDate(row.getCell(1).value),
                    vector: parseInt(row.getCell(2).text) || 0,
                    inboundCalls: parseNum(row.getCell(3).value),
                    flowIn: parseNum(row.getCell(4).value),
                    acdCalls: parseNum(row.getCell(5).value),
                    acdTime: parseNum(row.getCell(6).value),
                    holdTime: parseNum(row.getCell(7).value),
                    aht: parseNum(row.getCell(8).value),
                    avgSpeedAns: parseNum(row.getCell(9).value),
                    avgAcdTime: parseNum(row.getCell(10).value),
                    avgAcwTime: parseNum(row.getCell(11).value),
                    mainAcdCalls: parseNum(row.getCell(12).value),
                    backupAcdCalls: parseNum(row.getCell(13).value),
                    connectCalls: parseNum(row.getCell(14).value),
                    avgConnectTime: parseNum(row.getCell(15).value),
                    abanCalls: parseNum(row.getCell(16).value),
                    avgAbanTime: parseNum(row.getCell(17).value),
                    percentAban: parseNum(row.getCell(18).value),
                    forcedBusyCalls: parseNum(row.getCell(19).value),
                    percentBusy: parseNum(row.getCell(20).value),
                    forcedDiscCalls: parseNum(row.getCell(21).value),
                    flowOut: parseNum(row.getCell(22).value),
                    percentFlowOut: parseNum(row.getCell(23).value),
                    avgVdnTime: parseNum(row.getCell(24).value),
                    skillPref1: parseNum(row.getCell(25).value),
                    skillPref2: parseNum(row.getCell(26).value),
                    skillPref3: parseNum(row.getCell(27).value),
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
    async saveBatch(rows) {
        if (rows.length === 0)
            return;
        const uniqueRowsMap = new Map();
        for (const row of rows) {
            const uniqueKey = `${row.date.toISOString().split('T')[0]}_${row.vector}`;
            uniqueRowsMap.set(uniqueKey, row);
        }
        const cleanRows = Array.from(uniqueRowsMap.values());
        const values = cleanRows.map((r) => {
            return `(
                ${excel_utils_helper_1.ExcelUtils.formatSqlValue(r.date)}, ${r.vector}, ${r.inboundCalls}, ${r.flowIn}, 
                ${r.acdCalls}, ${r.acdTime}, ${r.holdTime}, ${r.aht}, ${r.avgSpeedAns}, 
                ${r.avgAcdTime}, ${r.avgAcwTime}, ${r.mainAcdCalls}, ${r.backupAcdCalls}, 
                ${r.connectCalls}, ${r.avgConnectTime}, ${r.abanCalls}, ${r.avgAbanTime}, 
                ${r.percentAban}, ${r.forcedBusyCalls}, ${r.percentBusy}, ${r.forcedDiscCalls}, 
                ${r.flowOut}, ${r.percentFlowOut}, ${r.avgVdnTime}, ${r.skillPref1}, 
                ${r.skillPref2}, ${r.skillPref3}
            )`;
        }).join(',');
        console.log(values);
        const query = `
            INSERT INTO "raw_avaya" (
                "date", "vector", "inbound_calls", "flow_in", "acd_calls", "acd_time", 
                "hold_time", "aht", "avg_speed_ans", "avg_acd_time", "avg_acw_time", 
                "main_acd_calls", "backup_acd_calls", "connect_calls", "avg_connect_time", 
                "aban_calls", "avg_aban_time", "percent_aban", "forced_busy_calls", 
                "percent_busy", "forced_disc_calls", "flow_out", "percent_flow_out", 
                "avg_vdn_time", "1st_skill_pref", "2nd_skill_pref", "3rd_skill_pref"
            )
            VALUES ${values}
            ON CONFLICT ("date", "vector")
            DO UPDATE SET
                "inbound_calls"      = EXCLUDED."inbound_calls",
                "flow_in"            = EXCLUDED."flow_in",
                "acd_calls"          = EXCLUDED."acd_calls",
                "acd_time"           = EXCLUDED."acd_time",
                "hold_time"          = EXCLUDED."hold_time",
                "aht"                = EXCLUDED."aht",
                "avg_speed_ans"      = EXCLUDED."avg_speed_ans",
                "avg_acd_time"       = EXCLUDED."avg_acd_time",
                "avg_acw_time"       = EXCLUDED."avg_acw_time",
                "main_acd_calls"     = EXCLUDED."main_acd_calls",
                "backup_acd_calls"   = EXCLUDED."backup_acd_calls",
                "connect_calls"      = EXCLUDED."connect_calls",
                "avg_connect_time"   = EXCLUDED."avg_connect_time",
                "aban_calls"         = EXCLUDED."aban_calls",
                "avg_aban_time"      = EXCLUDED."avg_aban_time",
                "percent_aban"       = EXCLUDED."percent_aban",
                "forced_busy_calls"  = EXCLUDED."forced_busy_calls",
                "percent_busy"       = EXCLUDED."percent_busy",
                "forced_disc_calls"  = EXCLUDED."forced_disc_calls",
                "flow_out"           = EXCLUDED."flow_out",
                "percent_flow_out"   = EXCLUDED."percent_flow_out",
                "avg_vdn_time"       = EXCLUDED."avg_vdn_time",
                "1st_skill_pref"     = EXCLUDED."1st_skill_pref",
                "2nd_skill_pref"     = EXCLUDED."2nd_skill_pref",
                "3rd_skill_pref"     = EXCLUDED."3rd_skill_pref"
            ;
        `;
        await this.prisma.$executeRawUnsafe(query);
    }
};
exports.AvayaUploadService = AvayaUploadService;
exports.AvayaUploadService = AvayaUploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AvayaUploadService);
//# sourceMappingURL=avaya-upload.service.js.map