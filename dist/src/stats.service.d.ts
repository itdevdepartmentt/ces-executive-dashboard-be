import { PrismaService } from '../prisma/prisma.service';
export declare class StatsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(): Promise<{
        id: number;
        totalSurvey: number;
        totalDijawab: number;
        totalJawaban45: number;
        persenCsat: number;
        scoreCsat: number;
        date: Date;
    }[]>;
}
