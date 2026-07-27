export declare const PRIORITY_TYPES: readonly ["roaming", "extra", "vip", "pareto", "urgent", "cc"];
export type PriorityType = (typeof PRIORITY_TYPES)[number];
export declare class DashboardFilterDto {
    startDate?: string;
    endDate?: string;
    isFcr?: boolean;
    fcrType?: 'kip' | 'realisasi';
    categories?: string[];
    subCategories?: string[];
    detailCategories?: string[];
}
export declare class PaginationDto extends DashboardFilterDto {
    page?: number;
    limit?: number;
    search?: string;
}
export declare class PriorityTicketQueryDto extends PaginationDto {
    type: PriorityType;
}
