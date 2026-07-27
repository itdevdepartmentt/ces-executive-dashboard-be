import { IncidentService } from './incident.service';
import { IncidentReport } from '@prisma/client';
export declare class IncidentController {
    private readonly incidentService;
    constructor(incidentService: IncidentService);
    create(data: {
        title: string;
        description: string;
    }): Promise<IncidentReport>;
    findActive(): Promise<IncidentReport[]>;
    findInactive(): Promise<IncidentReport[]>;
    solve(id: number): Promise<IncidentReport>;
}
