import { PrismaService } from '../../prisma/prisma.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getSummary(filter: DashboardFilterDto): Promise<{
        totalSurvey: number;
        totalDijawab: number;
        totalJawaban45: number;
        persenCsat: number;
        scoreCsat: number;
    }>;
    private buildDateFilter;
    private buildRawDateFilter;
}
