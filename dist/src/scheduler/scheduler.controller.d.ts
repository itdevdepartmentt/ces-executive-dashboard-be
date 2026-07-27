import { OcaReportSchedulerService } from 'src/worker/scheduler/oca-report-scheduler.service';
import { OcaTicketSchedulerService } from 'src/worker/scheduler/oca-ticket-scheduler.service';
export declare class ScheduleController {
    private readonly ocaReportService;
    private readonly ocaTicketSchedulerService;
    constructor(ocaReportService: OcaReportSchedulerService, ocaTicketSchedulerService: OcaTicketSchedulerService);
    getJobStatus(jobId: string): Promise<{
        status: string;
        progress: number;
        result: null;
    }>;
    triggerSync(startDate?: string, endDate?: string): Promise<{
        success?: boolean | undefined;
        jobId?: string | undefined;
        filePath?: string | undefined;
        message: string;
    }>;
    syncDailyOca(): Promise<{
        message: string;
        jobId: string;
        lastSync: string | null;
    }>;
    getLastSync(): Promise<{
        lastSyncWib: string | null;
    }>;
}
