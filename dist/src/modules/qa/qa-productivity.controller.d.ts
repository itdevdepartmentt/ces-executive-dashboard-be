import { QaProductivityService } from './qa-productivity.service';
export declare class QaProductivityController {
    private readonly qaProductivityService;
    constructor(qaProductivityService: QaProductivityService);
    getDashboard(month: string, year: string, date: string, req: any): Promise<{
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
    saveSettings(body: any): Promise<{
        success: boolean;
    }>;
    bulkDeleteSettings(body: {
        agentNames: string[];
        type?: string;
    }): Promise<{
        success: boolean;
    }>;
    parseExcel(file: Express.Multer.File): Promise<{
        parsedAgents: any[];
        parsedQcs: any[];
        conflictWarnings: string[];
    }>;
}
