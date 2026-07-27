import { PrismaService } from 'prisma/prisma.service';
import { DashboardFilterDto, PaginationDto, PriorityTicketQueryDto } from './dto/dashboard-filter.dto';
export declare class OcaOmnixService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private buildCategoryFilterQuery;
    private buildPrismaCategoryFilter;
    getExecutiveSummary(filter: DashboardFilterDto): Promise<any>;
    getPriorityData(filter: DashboardFilterDto): Promise<any>;
    getPriorityTickets(query: PriorityTicketQueryDto): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getCsatScore(filter: DashboardFilterDto): Promise<any[]>;
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
            limitVal: number;
        };
    }>;
    getSpecialAccountStats(filter: DashboardFilterDto, type: 'VIP' | 'PARETO'): Promise<{
        stats: any;
        topCorps: any[];
        topKips: any[];
    }>;
    getTopKipPerCompany(query: PaginationDto): Promise<{
        data: {
            company: any;
            totalTickets: any;
            companySla: any;
            topKips: {
                detail_category: any;
                kip_count: any;
                kip_sla: any;
                rn: any;
            }[];
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getProductBreakdown(filter: DashboardFilterDto): Promise<any[]>;
    getEboOrGtmEscalation(query: PaginationDto, eskalasi: any): Promise<{
        summary: {
            totalOpen: any;
            over3H: any;
        };
        data: {
            date: string;
            idTicket: string;
            idCase: string | null;
            duration: string;
            actName: string | null;
            unitId: string | null;
        }[];
        meta: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
        };
    }>;
    getBillcoEscalation(query: PaginationDto): Promise<{
        summary: {
            totalOpen: any;
            over3H: any;
        };
        data: {
            date: string;
            idTicket: string;
            kip: string | null;
            lob: string;
        }[];
        meta: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
        };
    }>;
    getItEscalation(query: PaginationDto): Promise<{
        summary: {
            totalOpen: any;
            over3H: any;
        };
        data: {
            date: string;
            idTicket: string;
            idRemedy: string | null;
            duration: string;
        }[];
        meta: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
        };
    }>;
    private createLookupMap;
    extractCaseIdAndUnitId(input: string): {
        unitId: string | null;
        caseId: string | null;
    };
    private cachedFilterOptions;
    private lastCacheTime;
    getFilterOptions(): Promise<any>;
}
