export declare class ExcelUtils {
    static parseExcelDate(value: any): Date | null;
    static parseNumber(value: any): number | null;
    static parseSafeBigInt(value: any): BigInt | null;
    static parseSafeInt(value: any): number | null;
    static formatSqlValue: (value: any) => string;
}
