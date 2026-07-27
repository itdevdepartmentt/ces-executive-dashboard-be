import { PrismaService } from 'prisma/prisma.service';
export declare class OcaUpsertService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    saveBatch(rows: any[]): Promise<void>;
}
