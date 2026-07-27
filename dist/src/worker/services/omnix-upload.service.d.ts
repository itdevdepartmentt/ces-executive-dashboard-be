import { Job } from 'bullmq';
import { PrismaService } from 'prisma/prisma.service';
export declare class OmnixUploadService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private readonly logger;
    private readonly vipRegex;
    private readonly HEADERS;
    process(job: Job<any, any, string>): Promise<any>;
    private saveBatch;
    private buildHeaderMap;
    private getCellByHeader;
    private classifyTicket;
    private createLookupMap;
    determineChannel(row: any, col: any, H: any): string;
}
