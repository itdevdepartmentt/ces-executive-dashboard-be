import { Queue } from 'bullmq';
export declare class UploadController {
    private excelQueue;
    constructor(excelQueue: Queue);
    uploadExcel(file: Express.Multer.File): Promise<{
        message: string;
        jobId: string | undefined;
    }>;
    uploadOmnixReport(file: Express.Multer.File): Promise<{
        message: string;
        jobId: string | undefined;
    }>;
    uploadCallReport(file: Express.Multer.File): Promise<{
        message: string;
        jobId: string | undefined;
        filename: string;
    }>;
    uploadAvayaReport(file: Express.Multer.File): Promise<{
        message: string;
        jobId: string | undefined;
        filename: string;
    }>;
    uploadOcaReport(file: Express.Multer.File): Promise<{
        message: string;
        jobId: string | undefined;
    }>;
    getJobStatus(jobId: string): Promise<{
        status: string;
        result: any;
        error?: undefined;
        progress?: undefined;
    } | {
        status: string;
        error: string;
        result?: undefined;
        progress?: undefined;
    } | {
        status: string;
        progress: import("bullmq").JobProgress;
        result?: undefined;
        error?: undefined;
    }>;
}
