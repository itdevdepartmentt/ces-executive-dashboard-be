"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleController = void 0;
const common_1 = require("@nestjs/common");
const oca_report_scheduler_service_1 = require("../worker/scheduler/oca-report-scheduler.service");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const oca_ticket_scheduler_service_1 = require("../worker/scheduler/oca-ticket-scheduler.service");
let ScheduleController = class ScheduleController {
    ocaReportService;
    ocaTicketSchedulerService;
    constructor(ocaReportService, ocaTicketSchedulerService) {
        this.ocaReportService = ocaReportService;
        this.ocaTicketSchedulerService = ocaTicketSchedulerService;
    }
    async getJobStatus(jobId) {
        return {
            status: 'completed',
            progress: 100,
            result: null,
        };
    }
    async triggerSync(startDate, endDate) {
        const start = startDate ||
            (0, moment_timezone_1.default)().tz('Asia/Jakarta').subtract(8, 'days').format('YYYY-MM-DD');
        const end = endDate ||
            (0, moment_timezone_1.default)().tz('Asia/Jakarta').subtract(1, 'days').format('YYYY-MM-DD');
        if (!(0, moment_timezone_1.default)(start, 'YYYY-MM-DD', true).isValid() ||
            !(0, moment_timezone_1.default)(end, 'YYYY-MM-DD', true).isValid()) {
            throw new common_1.BadRequestException('Invalid date format. Use YYYY-MM-DD');
        }
        const result = await this.ocaReportService.processOcaReport(start, end);
        return {
            message: 'Manual OCA Sync started and queued.',
            ...result,
        };
    }
    async syncDailyOca() {
        this.ocaTicketSchedulerService.handleCron().catch(e => {
            console.error('Background sync error:', e);
        });
        const lastSyncUtc = await this.ocaTicketSchedulerService.getLastSyncTime();
        const lastSync = lastSyncUtc
            ? (0, moment_timezone_1.default)(lastSyncUtc).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            : null;
        return {
            message: 'All ticket batches are syncing in the background.',
            jobId: 'background-sync',
            lastSync: lastSync,
        };
    }
    async getLastSync() {
        const lastSyncUtc = await this.ocaTicketSchedulerService.getLastSyncTime();
        const lastSyncWib = lastSyncUtc
            ? (0, moment_timezone_1.default)(lastSyncUtc).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            : null;
        return { lastSyncWib };
    }
};
exports.ScheduleController = ScheduleController;
__decorate([
    (0, common_1.Get)('status/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Post)('trigger-oca-sync'),
    __param(0, (0, common_1.Body)('startDate')),
    __param(1, (0, common_1.Body)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "triggerSync", null);
__decorate([
    (0, common_1.Post)('sync-daily-oca'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "syncDailyOca", null);
__decorate([
    (0, common_1.Get)('last-sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "getLastSync", null);
exports.ScheduleController = ScheduleController = __decorate([
    (0, common_1.Controller)('schedule'),
    __metadata("design:paramtypes", [oca_report_scheduler_service_1.OcaReportSchedulerService,
        oca_ticket_scheduler_service_1.OcaTicketSchedulerService])
], ScheduleController);
//# sourceMappingURL=scheduler.controller.js.map