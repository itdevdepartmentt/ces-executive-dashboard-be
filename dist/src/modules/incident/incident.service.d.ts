import { PrismaService } from '../../../prisma/prisma.service';
import { IncidentReport, Prisma } from '@prisma/client';
export declare class IncidentService {
    private prisma;
    constructor(prisma: PrismaService);
    createIncident(data: Prisma.IncidentReportCreateInput): Promise<IncidentReport>;
    getActiveIncidents(): Promise<IncidentReport[]>;
    getInactiveIncidents(): Promise<IncidentReport[]>;
    solveIncident(id: number): Promise<IncidentReport>;
}
