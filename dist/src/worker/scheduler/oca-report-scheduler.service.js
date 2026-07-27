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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OcaReportSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcaReportSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
let OcaReportSchedulerService = OcaReportSchedulerService_1 = class OcaReportSchedulerService {
    logger = new common_1.Logger(OcaReportSchedulerService_1.name);
    constructor() { }
    async handleScheduledReport() {
        this.logger.log('Starting scheduled OCA Report process...');
        try {
            const endDate = (0, moment_timezone_1.default)()
                .tz('Asia/Jakarta')
                .subtract(1, 'days')
                .format('YYYY-MM-DD');
            const startDate = (0, moment_timezone_1.default)()
                .tz('Asia/Jakarta')
                .subtract(8, 'days')
                .format('YYYY-MM-DD');
            return await this.processOcaReport(startDate, endDate);
        }
        catch (err) {
            this.logger.error(`OCA Report Scheduler top-level error: ${err.message}`);
        }
    }
    async processOcaReport(startDate, endDate) {
        this.logger.log(`Processing OCA Report from ${startDate} to ${endDate}...`);
        try {
            const documentId = await this.requestReportGeneration(startDate, endDate);
            const downloadUrl = await this.pollForDownloadUrl(documentId);
            const filePath = await this.downloadFile(downloadUrl);
            this.logger.log(`Successfully downloaded report for processing: ${filePath}`);
            return { success: true, jobId: "sync", filePath };
        }
        catch (error) {
            this.logger.error('Failed to process scheduled OCA report', error.stack);
        }
    }
    async requestReportGeneration(start, end) {
        const response = await axios_1.default.post('https://webapigw.ocatelkom.co.id/oca-interaction/ticketing/request_report', {
            agents: [],
            agent_supervisor: '621464b818b240212019132c',
            category_id: [],
            start_date: start,
            end_date: end,
            priority: [],
            source: [],
            type: 'csv',
            department_id: [],
            status: [],
            header_default: [
                'No.',
                'Ticket Number',
                'Ticket Subject',
                'Channel',
                'Category',
                'Reporter',
                'Assignee',
                'Department',
                'Priority',
                'Last Status',
                'Ticket Created',
                'Last Update',
                'Description',
                'Customer Name',
                'Customer Phone',
                'Customer Address',
                'Customer Email',
                'First Response Time',
                'Total Response Time',
                'Total Resolution Time',
                'Resolve Time',
                'Resolved By',
                'Closed Time',
                'Ticket Duration',
                'Count Inbound Message',
                'Label In Room',
                'First Response Duration',
                'Escalate Ticket',
                'Last Assignee Escalation',
                'Last Status Escalation',
                'Last Update Escalation',
            ],
            header_sub_category: [
                'Sub Category',
                'Detail Category',
                'IOT',
                'Amount Revenue',
                'Jumlah MSISDN',
                'Tags',
                'ID Remedy_NO',
                'Eskalasi/ID Remedy_IT/AO/EMS',
                'Reason OSL',
                'Project ID',
                'Nama Perusahaan',
                'Roaming',
            ],
            model_data: 'ticket_report',
        }, {
            auth: {
                username: 'tsel-app-connectivity',
                password: '@tsel198xMu918230pp',
            },
        });
        if (!response.data.status)
            throw new Error('OCA Report Request Failed');
        return response.data.results.document_id;
    }
    async pollForDownloadUrl(docId) {
        const maxRetries = 20;
        const initialDelay = 5000;
        const delay = 30000;
        this.logger.log(`Report requested. Waiting ${initialDelay / 1000}s for initialization...`);
        await new Promise((res) => setTimeout(res, initialDelay));
        for (let i = 0; i < maxRetries; i++) {
            try {
                this.logger.log(`Checking report status (Attempt ${i + 1}/${maxRetries})...`);
                const response = await axios_1.default.get(`https://webapigw.ocatelkom.co.id/tsel/download-ticket-report/${docId}`);
                if (response.data?.status && response.data?.results?.url) {
                    return response.data.results.url;
                }
            }
            catch (error) {
                const errorData = error.response?.data;
                if (error.response?.status === 404 &&
                    errorData?.errors?.[0]?.code === '33') {
                    this.logger.warn(`Report ${docId} is still generating. Waiting 30s...`);
                }
                else if (error.response?.status === 404) {
                    this.logger.warn(`Document ID not recognized yet. Retrying...`);
                }
                else {
                    this.logger.error(`Critical API Error: ${error.message}`);
                    throw error;
                }
            }
            await new Promise((res) => setTimeout(res, delay));
        }
        throw new Error('TIMEOUT: OCA Report generation took longer than 10 minutes.');
    }
    async downloadFile(url) {
        const fileName = `oca_report_${Date.now()}.csv`;
        const destination = path.resolve('./uploads', fileName);
        try {
            const response = await (0, axios_1.default)({
                method: 'GET',
                url: url,
                responseType: 'stream',
                timeout: 60000,
            });
            const writer = fs.createWriteStream(destination);
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(destination));
                writer.on('error', (err) => {
                    this.logger.error(`File write error: ${err.message}`);
                    reject(err);
                });
                response.data.on('error', (err) => {
                    this.logger.error(`Stream error during download: ${err.message}`);
                    reject(err);
                });
            });
        }
        catch (err) {
            this.logger.error(`downloadFile failed: ${err.message}`);
            throw err;
        }
    }
};
exports.OcaReportSchedulerService = OcaReportSchedulerService;
exports.OcaReportSchedulerService = OcaReportSchedulerService = OcaReportSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OcaReportSchedulerService);
//# sourceMappingURL=oca-report-scheduler.service.js.map