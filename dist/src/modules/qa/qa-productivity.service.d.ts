import { PrismaService } from 'prisma/prisma.service';
export declare class QaProductivityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDashboard(month: number, year: number, dateStr: string, user?: any): Promise<{
        qcProductivity: any[];
        agentPerformance: any[];
        realtimeOverview: {
            totalEksekutor: number;
            targetEksekutor: number;
            totalChat: number;
            totalCallCenter: number;
            totalBillco: number;
            totalEmailGs: number;
            totalLainnya: number;
            totalAll: number;
            targetAll: number;
        };
    }>;
    getSettings(): Promise<{
        qcs: {
            name: string;
            daily: any;
            peak1: any;
            peak2: any;
            peak3: any;
            monthly: any;
        }[];
        agents: any[];
    }>;
    saveSettings(data: {
        qcs: any[];
        agents: any[];
    }): Promise<{
        success: boolean;
    }>;
    bulkDeleteSettings(agentNames: string[], type?: string): Promise<{
        success: boolean;
    }>;
    private retroactivelyUpdateTickets;
    parseExcelSettings(file: Express.Multer.File): Promise<{
        parsedAgents: any[];
        parsedQcs: any[];
        conflictWarnings: string[];
    }>;
}
