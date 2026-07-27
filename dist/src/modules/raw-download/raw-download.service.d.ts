import { PrismaService } from '../../../prisma/prisma.service';
type ExportType = 'omnix' | 'oca' | 'call' | 'news-log';
type DownloadDateRangeQuery = {
    startDate?: string;
    endDate?: string;
};
export declare class RawDownloadService {
    private readonly prisma;
    private static readonly JAKARTA_OFFSET_MS;
    constructor(prisma: PrismaService);
    generateWorkbookBuffer(type: ExportType, dateRangeQuery?: DownloadDateRangeQuery): Promise<Buffer>;
    getFileName(type: ExportType): string;
    private getSheetName;
    private getRows;
    private getNewsLogRows;
    private parseDateRange;
    private parseDateInput;
    private buildWhereByType;
    private buildDateFilter;
    private omitExcludedColumns;
    private normalizeCellValue;
    private formatDateToJakarta;
}
export {};
