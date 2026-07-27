import { PrismaService } from 'prisma/prisma.service';
import { Job } from 'bullmq';
import { OcaUpsertService } from '../repository/oca-upsert.service';
export declare class OcaUploadService {
    private readonly prisma;
    private readonly ocaUpsertService;
    private readonly logger;
    constructor(prisma: PrismaService, ocaUpsertService: OcaUpsertService);
    process(job: Job): Promise<{
        status: string;
    }>;
    detectDelimiter(filePath: any): "," | ";";
}
