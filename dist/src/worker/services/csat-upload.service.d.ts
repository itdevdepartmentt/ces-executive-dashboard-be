import { Job } from 'bullmq';
import { PrismaService } from 'prisma/prisma.service';
export declare class CsatUploadService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    process(job: Job<any, any, string>): Promise<any>;
    private saveBatch;
    private refreshDailyStats;
}
