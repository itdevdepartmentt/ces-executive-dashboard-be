import { Job } from "bullmq";
import { PrismaService } from "prisma/prisma.service";
export declare class AvayaUploadService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    process(job: Job): Promise<{
        status: string;
    }>;
    private saveBatch;
}
