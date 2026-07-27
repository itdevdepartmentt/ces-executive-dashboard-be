export declare const TICKET_RULES: ({
    status: string;
    column: string;
    prop: string;
    check: (val: string) => boolean;
    regex?: undefined;
} | {
    status: string;
    column: string;
    prop: string;
    regex: RegExp;
    check: (val: string) => any;
})[];
export declare const TICKET_RULES_OMNIX: ({
    status: string;
    column: string;
    regex: RegExp;
    check: (val: string) => any;
} | {
    status: string;
    column: string;
    check: (val: string) => boolean;
    regex?: undefined;
})[];
export declare function calculateSlaStatus(row: any): boolean;
export declare function calculateFcrStatus(row: any): boolean;
export declare function determineEskalasi(row: any): string;
