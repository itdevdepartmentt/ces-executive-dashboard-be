"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerModule = void 0;
const common_1 = require("@nestjs/common");
const scheduler_controller_1 = require("./scheduler.controller");
const prisma_service_1 = require("../../prisma/prisma.service");
const excel_module_1 = require("../worker/excel.module");
const oca_ticket_scheduler_service_1 = require("../worker/scheduler/oca-ticket-scheduler.service");
const daily_oca_ticket_processor_1 = require("../worker/processor/daily-oca-ticket-processor");
const oca_upsert_service_1 = require("../worker/repository/oca-upsert.service");
const oca_report_scheduler_service_1 = require("../worker/scheduler/oca-report-scheduler.service");
let SchedulerModule = class SchedulerModule {
};
exports.SchedulerModule = SchedulerModule;
exports.SchedulerModule = SchedulerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            excel_module_1.ExcelModule,
        ],
        controllers: [scheduler_controller_1.ScheduleController],
        providers: [
            prisma_service_1.PrismaService,
            oca_ticket_scheduler_service_1.OcaTicketSchedulerService,
            daily_oca_ticket_processor_1.DailyOcaTicketProcessor,
            oca_upsert_service_1.OcaUpsertService,
            oca_report_scheduler_service_1.OcaReportSchedulerService,
        ],
    })
], SchedulerModule);
//# sourceMappingURL=scheduler.module.js.map