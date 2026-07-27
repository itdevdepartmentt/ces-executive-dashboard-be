import { LookupManagementService } from './lookup-management.service';
import { CreateAccountMappingDto, UpdateAccountMappingDto, CreateLookupKIPDto, UpdateLookupKIPDto, CreateLookupAgentDto, UpdateLookupAgentDto, QueryLookupDto } from './dto/lookup-management.dto';
export declare class LookupManagementController {
    private readonly service;
    constructor(service: LookupManagementService);
    uploadLookupCsv(lookupType: string, file: Express.Multer.File): Promise<{
        lookupType: string;
        filename: string | undefined;
        totalRows: number;
        insertedRows: number;
        failedRowsCount: number;
        skippedInvalidRows: number;
        failedRows: {
            rowNumber: number;
            reason: string;
        }[];
    }>;
    findAllAccountMappings(query: QueryLookupDto): Promise<{
        data: {
            id: number;
            group: string | null;
            department: string | null;
            corporateName: string | null;
            kategoriAccount: string | null;
            b2b_account_id: string;
            divisi: string | null;
            mppCodeNew: string | null;
            namaAM: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
            filterOptions: {
                kategoriAccount: (string | null)[];
                group: (string | null)[];
                divisi: (string | null)[];
                department: (string | null)[];
            };
        };
    }>;
    createAccountMapping(dto: CreateAccountMappingDto): Promise<{
        id: number;
        group: string | null;
        department: string | null;
        corporateName: string | null;
        kategoriAccount: string | null;
        b2b_account_id: string;
        divisi: string | null;
        mppCodeNew: string | null;
        namaAM: string | null;
    }>;
    updateAccountMapping(id: number, dto: UpdateAccountMappingDto): Promise<{
        id: number;
        group: string | null;
        department: string | null;
        corporateName: string | null;
        kategoriAccount: string | null;
        b2b_account_id: string;
        divisi: string | null;
        mppCodeNew: string | null;
        namaAM: string | null;
    }>;
    deleteAccountMapping(id: number): Promise<{
        id: number;
        group: string | null;
        department: string | null;
        corporateName: string | null;
        kategoriAccount: string | null;
        b2b_account_id: string;
        divisi: string | null;
        mppCodeNew: string | null;
        namaAM: string | null;
    }>;
    deleteAllAccountMappings(): Promise<import("@prisma/client").Prisma.BatchPayload>;
    findAllLookupKIP(query: QueryLookupDto): Promise<{
        data: {
            id: number;
            category: string | null;
            subCategory: string | null;
            detailCategory: string | null;
            product: string | null;
            isFcr: boolean | null;
            compositeKey: string | null;
            compositeKeyOmnix: string | null;
            fcrNonMassal: string | null;
            detailCategoryFull: string | null;
            detailCategory2: string | null;
            fcrNonSatuan: string | null;
            escToSatuan: string | null;
            escToMassal: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
            filterOptions: {
                category: (string | null)[];
                product: (string | null)[];
                escToSatuan: (string | null)[];
                escToMassal: (string | null)[];
            };
        };
    }>;
    createLookupKIP(dto: CreateLookupKIPDto): Promise<{
        id: number;
        category: string | null;
        subCategory: string | null;
        detailCategory: string | null;
        product: string | null;
        isFcr: boolean | null;
        compositeKey: string | null;
        compositeKeyOmnix: string | null;
        fcrNonMassal: string | null;
        detailCategoryFull: string | null;
        detailCategory2: string | null;
        fcrNonSatuan: string | null;
        escToSatuan: string | null;
        escToMassal: string | null;
    }>;
    updateLookupKIP(id: number, dto: UpdateLookupKIPDto): Promise<{
        id: number;
        category: string | null;
        subCategory: string | null;
        detailCategory: string | null;
        product: string | null;
        isFcr: boolean | null;
        compositeKey: string | null;
        compositeKeyOmnix: string | null;
        fcrNonMassal: string | null;
        detailCategoryFull: string | null;
        detailCategory2: string | null;
        fcrNonSatuan: string | null;
        escToSatuan: string | null;
        escToMassal: string | null;
    }>;
    deleteLookupKIP(id: number): Promise<{
        id: number;
        category: string | null;
        subCategory: string | null;
        detailCategory: string | null;
        product: string | null;
        isFcr: boolean | null;
        compositeKey: string | null;
        compositeKeyOmnix: string | null;
        fcrNonMassal: string | null;
        detailCategoryFull: string | null;
        detailCategory2: string | null;
        fcrNonSatuan: string | null;
        escToSatuan: string | null;
        escToMassal: string | null;
    }>;
    deleteAllLookupKIP(): Promise<import("@prisma/client").Prisma.BatchPayload>;
    findAllLookupAgent(query: QueryLookupDto): Promise<{
        data: {
            id: number;
            tapper: string | null;
            teamLeader: string | null;
            namaAgent: string | null;
            group: string | null;
            peak1: number;
            peak2: number;
            peak3: number;
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
            filterOptions: {
                group: (string | null)[];
            };
        };
    }>;
    createLookupAgent(dto: CreateLookupAgentDto): Promise<{
        id: number;
        tapper: string | null;
        teamLeader: string | null;
        namaAgent: string | null;
        group: string | null;
        peak1: number;
        peak2: number;
        peak3: number;
    }>;
    updateLookupAgent(id: number, dto: UpdateLookupAgentDto): Promise<{
        id: number;
        tapper: string | null;
        teamLeader: string | null;
        namaAgent: string | null;
        group: string | null;
        peak1: number;
        peak2: number;
        peak3: number;
    }>;
    deleteLookupAgent(id: number): Promise<{
        id: number;
        tapper: string | null;
        teamLeader: string | null;
        namaAgent: string | null;
        group: string | null;
        peak1: number;
        peak2: number;
        peak3: number;
    }>;
    deleteAllLookupAgent(): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
