export declare const VIP_REGEX: RegExp;
export declare function createLookupMap(modelDelegate: any, keyField: string, valueField: string): Promise<Map<string, string>>;
export declare function classifyTicket(row: any): {
    status: string;
    isValid: boolean;
    reason: string;
};
export declare function determineChannel(row: {
    department?: string;
    channelOca?: string;
    ticketSubject?: string;
    assignee?: string;
    reporter?: string;
}, agentMap: Map<string, string>): string;
