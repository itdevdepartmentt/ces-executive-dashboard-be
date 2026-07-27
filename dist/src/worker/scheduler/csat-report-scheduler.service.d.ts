export declare class CsatReportSchedulerService {
    private readonly logger;
    constructor();
    handleScheduledReport(): Promise<{
        success: boolean;
        jobId: string;
        filePath: string;
    } | undefined>;
    processCsatReport(todayDate: string): Promise<{
        success: boolean;
        jobId: string;
        filePath: string;
    } | undefined>;
    private requestReportGeneration;
    private pollForDownloadUrl;
    private downloadFile;
}
