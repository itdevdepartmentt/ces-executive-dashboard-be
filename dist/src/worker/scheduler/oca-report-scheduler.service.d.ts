export declare class OcaReportSchedulerService {
    private readonly logger;
    constructor();
    handleScheduledReport(): Promise<{
        success: boolean;
        jobId: string;
        filePath: string;
    } | undefined>;
    processOcaReport(startDate: string, endDate: string): Promise<{
        success: boolean;
        jobId: string;
        filePath: string;
    } | undefined>;
    private requestReportGeneration;
    private pollForDownloadUrl;
    private downloadFile;
}
