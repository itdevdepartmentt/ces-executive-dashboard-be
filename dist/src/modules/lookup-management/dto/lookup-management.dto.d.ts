export declare class CreateAccountMappingDto {
    b2b_account_id: string;
    corporateName?: string;
    kategoriAccount?: string;
    group?: string;
    divisi?: string;
    department?: string;
    mppCodeNew?: string;
    namaAM?: string;
}
export declare class UpdateAccountMappingDto {
    b2b_account_id?: string;
    corporateName?: string;
    kategoriAccount?: string;
    group?: string;
    divisi?: string;
    department?: string;
    mppCodeNew?: string;
    namaAM?: string;
}
export declare class CreateLookupKIPDto {
    category?: string;
    subCategory?: string;
    detailCategoryFull?: string;
    detailCategory?: string;
    detailCategory2?: string;
    compositeKeyOmnix?: string;
    compositeKey?: string;
    fcrNonSatuan?: string;
    escToSatuan?: string;
    fcrNonMassal?: string;
    escToMassal?: string;
    isFcr?: boolean;
    product?: string;
}
export declare class UpdateLookupKIPDto extends CreateLookupKIPDto {
}
export declare class CreateLookupAgentDto {
    namaAgent?: string;
    group?: string;
}
export declare class UpdateLookupAgentDto extends CreateLookupAgentDto {
}
export declare class QueryLookupDto {
    page?: number;
    limit?: number;
    search?: string;
    filters?: string;
}
