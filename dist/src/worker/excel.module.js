"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelModule = void 0;
const common_1 = require("@nestjs/common");
const excel_processor_1 = require("./excel.processor");
const prisma_service_1 = require("../../prisma/prisma.service");
const call_upload_service_1 = require("./services/call-upload.service");
const csat_upload_service_1 = require("./services/csat-upload.service");
const oca_upload_service_1 = require("./services/oca-upload.service");
const omnix_upload_service_1 = require("./services/omnix-upload.service");
const oca_upsert_service_1 = require("./repository/oca-upsert.service");
const oca_report_scheduler_service_1 = require("./scheduler/oca-report-scheduler.service");
const avaya_upload_service_1 = require("./services/avaya-upload.service");
const csat_report_scheduler_service_1 = require("./scheduler/csat-report-scheduler.service");
let ExcelModule = class ExcelModule {
};
exports.ExcelModule = ExcelModule;
exports.ExcelModule = ExcelModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [],
        providers: [
            excel_processor_1.ExcelProcessor,
            call_upload_service_1.CallUploadService,
            csat_upload_service_1.CsatUploadService,
            oca_upload_service_1.OcaUploadService,
            omnix_upload_service_1.OmnixUploadService,
            avaya_upload_service_1.AvayaUploadService,
            prisma_service_1.PrismaService,
            oca_upsert_service_1.OcaUpsertService,
            oca_report_scheduler_service_1.OcaReportSchedulerService,
            csat_report_scheduler_service_1.CsatReportSchedulerService,
        ],
    })
], ExcelModule);
//# sourceMappingURL=excel.module.js.map