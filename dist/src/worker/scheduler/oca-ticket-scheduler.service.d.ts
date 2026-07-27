import { PrismaService } from 'prisma/prisma.service';
import { DailyOcaTicketProcessor } from '../processor/daily-oca-ticket-processor';
export declare class OcaTicketSchedulerService {
    private readonly processor;
    private readonly prisma;
    private readonly logger;
    constructor(processor: DailyOcaTicketProcessor, prisma: PrismaService);
    handleCron(): Promise<{
        lastJob: string;
        lastSync: string | null;
    }>;
    getLastSyncTime(): Promise<Date | null>;
}
