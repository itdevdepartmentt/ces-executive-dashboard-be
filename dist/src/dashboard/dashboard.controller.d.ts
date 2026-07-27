import { DashboardService } from './dashboard.service';
import { DashboardFilterDto, PaginationDto, PriorityTicketQueryDto } from './dto/dashboard-filter.dto';
import { OcaOmnixService } from './oca-omnix.service';
export declare class DashboardController {
    private readonly dashboardService;
    private readonly ocaService;
    constructor(dashboardService: DashboardService, ocaService: OcaOmnixService);
    getSummaryDashboard(filter: DashboardFilterDto): Promise<{
        totalSurvey: number;
        totalDijawab: number;
        totalJawaban45: number;
        persenCsat: number;
        scoreCsat: number;
    }>;
    getSummary(filter: DashboardFilterDto): Promise<any>;
    getFilterOptions(): Promise<any>;
    getChannels(filter: DashboardFilterDto): Promise<any[]>;
    getEscalations(filter: PaginationDto): Promise<{
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
    getVipPareto(filter: DashboardFilterDto): Promise<{
        vip: {
            stats: any;
            topCorps: any[];
            topKips: any[];
        };
        pareto: {
            stats: any;
            topCorps: any[];
            topKips: any[];
        };
    }>;
    getCompanyKips(filter: PaginationDto): Promise<{
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
    getProducts(filter: DashboardFilterDto): Promise<any[]>;
    getEboEscalation(query: PaginationDto): Promise<{
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
    getGtmEscalation(query: PaginationDto): Promise<{
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
    getCsatScore(filter: DashboardFilterDto): Promise<any[]>;
    getPriority(filter: DashboardFilterDto): Promise<any>;
    getPriorityTickets(query: PriorityTicketQueryDto): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
