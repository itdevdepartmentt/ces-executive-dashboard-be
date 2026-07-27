import { PrismaService } from 'prisma/prisma.service';
export declare class QaProductivityService {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(): Promise<{
        qcs: any[];
        agents: any[];
    }>;
    updateSettings(data: {
        qcs: any[];
        agents: any[];
    }): Promise<{
        success: boolean;
    }>;
    getDashboardData(month: number, year: number, dateStr: string): Promise<{
        settings: {
            id: string;
            type: string;
            name: string;
            tapper: string;
            updatedAt: Date;
            peak1: number;
            peak2: number;
            peak3: number;
            daily: number;
            monthly: number;
        }[];
        qcProductivity: {
            tapper: string;
            totalAgent: number;
            agentNames: string;
            dailyTarget: number;
            dailyRealization: number;
            dailyRemaining: number;
            monthlyTarget: number;
            monthlyRealization: number;
            monthlyRemaining: number;
            peak1Target: number;
            peak1Realization: number;
            peak1Remaining: number;
            peak2Target: number;
            peak2Realization: number;
            peak2Remaining: number;
            peak3Target: number;
            peak3Realization: number;
            peak3Remaining: number;
        }[];
        agentPerformance: {
            agent: string;
            monthlyTarget: number;
            monthlyRealization: number;
            monthlyRemaining: number;
            peak1Target: number;
            peak1Realization: number;
            peak1Remaining: number;
            peak2Target: number;
            peak2Realization: number;
            peak2Remaining: number;
            peak3Target: number;
            peak3Realization: number;
            peak3Remaining: number;
        }[];
        realtimeOverview: {
            totalAll: number;
            totalEksekutor: number;
            targetAll: number;
            targetEksekutor: number;
        };
    }>;
}
