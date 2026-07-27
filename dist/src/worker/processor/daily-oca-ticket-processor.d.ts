import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'prisma/prisma.service';
import { OcaUpsertService } from '../repository/oca-upsert.service';
export declare class DailyOcaTicketProcessor extends WorkerHost {
    private readonly prisma;
    private readonly ocaUpsertService;
    private readonly logger;
    constructor(prisma: PrismaService, ocaUpsertService: OcaUpsertService);
    process(job: Job<any, any, string>): Promise<any>;
    private extractLatestCustomFields;
    private mapToDomainModel;
}
