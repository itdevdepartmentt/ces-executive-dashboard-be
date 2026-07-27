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
var OcaTicketSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcaTicketSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const axios_retry_util_1 = require("../utils/axios-retry.util");
const moment_1 = __importDefault(require("moment"));
const prisma_service_1 = require("../../../prisma/prisma.service");
const daily_oca_ticket_processor_1 = require("../processor/daily-oca-ticket-processor");
let OcaTicketSchedulerService = OcaTicketSchedulerService_1 = class OcaTicketSchedulerService {
    processor;
    prisma;
    logger = new common_1.Logger(OcaTicketSchedulerService_1.name);
    constructor(processor, prisma) {
        this.processor = processor;
        this.prisma = prisma;
    }
    async handleCron() {
        this.logger.debug('Starting ticket sync...');
        const todayDate = (0, moment_1.default)().tz('Asia/Jakarta').format('YYYY-MM-DD');
        let page = 1;
        let hasMore = true;
        let lastJob = '';
        while (hasMore) {
            try {
                const response = await (0, axios_retry_util_1.axiosPostWithRetry)('https://webapigw.ocatelkom.co.id/oca-interaction/ticketing/get-list', {
                    agent_id: '621464b818b240212019132c',
                    application: '621463e262b3c500214ab937',
                    filterOptions: [
                        {
                            key: 'range_date',
                            values: { start_date: todayDate, end_date: todayDate },
                        },
                    ],
                    limit: 100,
                    page: page,
                    search: {
                        key: '',
                        value: '',
                    },
                    sort: { created: -1 },
                });
                const tickets = response.data.results.data;
                const ticketNumbers = tickets.map((t) => t.ticket_number);
                const dbRows = await this.prisma.$queryRaw `
        SELECT "ticket_number", "last_update"
        FROM "RawOca"
        WHERE "ticket_number" = ANY(${ticketNumbers});
`;
                const dbMap = new Map(dbRows.map((r) => [r.ticket_number, r.last_update?.getTime()]));
                this.logger.log(`syncing ticket for date ${todayDate}`);
                const ticketsToProcess = tickets.filter((t) => {
                    const dbLast = dbMap.get(t.ticket_number);
                    if (!dbLast)
                        return true;
                    return new Date(t.updated_at).getTime() > dbLast;
                });
                if (ticketsToProcess.length > 0) {
                    const batchChunkSize = 10;
                    for (let i = 0; i < ticketsToProcess.length; i += batchChunkSize) {
                        const chunk = ticketsToProcess.slice(i, i + batchChunkSize);
                        const chunkId = `batch-${page}-${chunk[0].ticket_id}-${(0, moment_1.default)().unix()}`;
                        try {
                            await this.processor.process({ data: { tickets: chunk } });
                            this.logger.log(`Processed batch page ${page} (chunk ${i / batchChunkSize + 1}) with ${chunk.length} tickets, jobId: ${chunkId}`);
                            lastJob = chunkId;
                        }
                        catch (processErr) {
                            this.logger.error(`Failed to process chunk ${chunkId}: ${processErr.message}`);
                        }
                    }
                }
                if (page >= response.data.results.pages) {
                    hasMore = false;
                }
                else {
                    page++;
                }
            }
            catch (err) {
                this.logger.error(`Failed to fetch OCA list API (page ${page}): ${err.message}`);
                hasMore = false;
            }
        }
        const now = new Date();
        const lastSyncWib = now
            ? (0, moment_1.default)(now).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            : null;
        try {
            await this.prisma.ocaDailySync.upsert({
                where: { id: 1 },
                update: { lastSync: now },
                create: { id: 1, lastSync: now },
            });
        }
        catch (err) {
            this.logger.error(`Failed to update last sync time: ${err.message}`);
        }
        this.logger.log('Ticket sync process completed.');
        return { lastJob, lastSync: lastSyncWib };
    }
    async getLastSyncTime() {
        const record = await this.prisma.ocaDailySync.findUnique({
            where: { id: 1 },
        });
        return record?.lastSync ?? null;
    }
};
exports.OcaTicketSchedulerService = OcaTicketSchedulerService;
exports.OcaTicketSchedulerService = OcaTicketSchedulerService = OcaTicketSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => daily_oca_ticket_processor_1.DailyOcaTicketProcessor))),
    __metadata("design:paramtypes", [daily_oca_ticket_processor_1.DailyOcaTicketProcessor,
        prisma_service_1.PrismaService])
], OcaTicketSchedulerService);
//# sourceMappingURL=oca-ticket-scheduler.service.js.map