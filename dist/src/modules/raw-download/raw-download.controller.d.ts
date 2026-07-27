import express from 'express';
import { RawDownloadService } from './raw-download.service';
export declare class RawDownloadController {
    private readonly service;
    constructor(service: RawDownloadService);
    downloadRawOmnix(res: express.Response, startDate?: string, endDate?: string): Promise<express.Response<any, Record<string, any>>>;
    downloadRawOca(res: express.Response, startDate?: string, endDate?: string): Promise<express.Response<any, Record<string, any>>>;
    downloadRawCall(res: express.Response, startDate?: string, endDate?: string): Promise<express.Response<any, Record<string, any>>>;
    downloadNewsLog(res: express.Response, startDate?: string, endDate?: string): Promise<express.Response<any, Record<string, any>>>;
    private sendExcelFile;
}
