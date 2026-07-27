import { PrismaService } from 'prisma/prisma.service';
import { DashboardFilterDto, PaginationDto } from './dto/dashboard-filter.dto';
export declare class OcaService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getExecutiveSummary(filter: DashboardFilterDto): Promise<any>;
    getChannelStats(filter: DashboardFilterDto): Promise<any[]>;
    private getTopEntityForChannel;
    getEscalationSummary(query: PaginationDto): Promise<{
        summary: any[];
        list: {
            data: {
                ticketNumber: string;
                assignee: string | null;
                department: string | null;
                ticketCreated: Date | null;
                ticketDuration: string | null;
                idRemedyNo: string | null;
                eskalasi: string | null;
            }[];
            total: number;
            page: number | undefined;
            limit: number | undefined;
        };
    }>;
    getSpecialAccountStats(filter: DashboardFilterDto, type: 'VIP' | 'PARETO'): Promise<{
        stats: any;
        topCorps: any[];
    }>;
    getTopKipPerCompany(query: PaginationDto): Promise<{
        company: any;
        totalTickets: any;
        topKips: any[];
    }[] | {
        data: never[];
        total: number;
    }>;
    getProductBreakdown(filter: DashboardFilterDto): Promise<any[]>;
}
