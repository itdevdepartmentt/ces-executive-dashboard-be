"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelUtils = void 0;
class ExcelUtils {
    static parseExcelDate(value) {
        if (value == null || value === '')
            return null;
        const WIB_OFFSET = 7 * 60 * 60 * 1000;
        if (typeof value === 'number') {
            return new Date(Date.UTC(1970, 0, 1) + (value - 25569) * 86400000 - WIB_OFFSET);
        }
        if (value instanceof Date) {
            return new Date(value.getTime() - WIB_OFFSET);
        }
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                const [datePart, timePart] = value.split(' ');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hour = 0, minute = 0, second = 0] = timePart?.split(':').map(Number) ?? [];
                return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - WIB_OFFSET);
            }
            if (/^\d+([.,]\d+)?$/.test(value)) {
                const num = Number(value.replace(',', '.'));
                return new Date(Date.UTC(1970, 0, 1) + (num - 25569) * 86400000 - WIB_OFFSET);
            }
            const [datePart, timePart] = value.split(' ');
            if (!datePart)
                return null;
            const [day, month, year] = datePart.split('/').map(Number);
            const [hour = 0, minute = 0, second = 0] = timePart?.split(':').map(Number) ?? [];
            return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - WIB_OFFSET);
        }
        return null;
    }
    static parseNumber(value) {
        if (!value)
            return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
    }
    static parseSafeBigInt(value) {
        if (!value)
            return null;
        let str = value.toString().trim();
        if (str === '-' || str === '~' || str === '')
            return null;
        str = str.replace(/[^0-9-]/g, '');
        try {
            return BigInt(str);
        }
        catch {
            return null;
        }
    }
    static parseSafeInt(value) {
        if (!value)
            return null;
        let str = value.toString().trim();
        if (str === '-' || str === '~' || str === '')
            return null;
        const num = parseInt(str);
        return isNaN(num) ? null : num;
    }
    static formatSqlValue = (value) => {
        if (value === null || value === undefined) {
            return 'NULL';
        }
        if (typeof value === 'number') {
            return isNaN(value) ? 'NULL' : value.toString();
        }
        if (typeof value === 'boolean') {
            return value ? 'TRUE' : 'FALSE';
        }
        if (value instanceof Date) {
            if (isNaN(value.getTime())) {
                return 'NULL';
            }
            return `'${value.toISOString()}'`;
        }
        if (typeof value === 'object') {
            const jsonString = JSON.stringify(value);
            const safeJson = jsonString.replace(/'/g, "''");
            return `'${safeJson}'`;
        }
        const safeString = value.toString().replace(/'/g, "''");
        return `'${safeString}'`;
    };
}
exports.ExcelUtils = ExcelUtils;
//# sourceMappingURL=excel-utils.helper.js.map