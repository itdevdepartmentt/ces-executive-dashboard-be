import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CsatUploadService } from './services/csat-upload.service';
import { CallUploadService } from './services/call-upload.service';
import { OmnixUploadService } from './services/omnix-upload.service';
import { OcaUploadService } from './services/oca-upload.service';
import { AvayaUploadService } from './services/avaya-upload.service';
export declare class ExcelProcessor extends WorkerHost {
    private prisma;
    private readonly csatUploadService;
    private readonly callUploadService;
    private readonly omnixUploadService;
    private readonly ocaUploadService;
    private readonly avayaUploadService;
    private readonly logger;
    constructor(prisma: PrismaService, csatUploadService: CsatUploadService, callUploadService: CallUploadService, omnixUploadService: OmnixUploadService, ocaUploadService: OcaUploadService, avayaUploadService: AvayaUploadService);
    process(job: Job<any, any, string>): Promise<any>;
    private removeFile;
}
