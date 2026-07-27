"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var LookupManagementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupManagementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const stream_1 = require("stream");
const csv_parser_1 = __importDefault(require("csv-parser"));
let LookupManagementService = LookupManagementService_1 = class LookupManagementService {
    prisma;
    logger = new common_1.Logger(LookupManagementService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async bulkUploadFromCsv(lookupType, file) {
        if (!file) {
            throw new common_1.BadRequestException('CSV file is required');
        }
        const normalizedLookupType = lookupType.trim().toLowerCase();
        const validTypes = [
            'account-mapping',
            'lookup-kip',
            'lookup-agent',
        ];
        if (!validTypes.includes(normalizedLookupType)) {
            throw new common_1.BadRequestException(`Invalid lookupType. Allowed values: ${validTypes.join(', ')}`);
        }
        const rows = await this.parseCsvRows(file.buffer);
        if (!rows.length) {
            throw new common_1.BadRequestException('CSV file is empty or has no data rows');
        }
        switch (normalizedLookupType) {
            case 'account-mapping':
                return this.bulkInsertAccountMapping(rows, file.originalname);
            case 'lookup-kip':
                return this.bulkInsertLookupKip(rows, file.originalname);
            case 'lookup-agent':
                return this.bulkInsertLookupAgent(rows, file.originalname);
            default:
                throw new common_1.BadRequestException('Unsupported lookupType');
        }
    }
    async parseCsvRows(fileBuffer) {
        const rows = [];
        const delimiter = this.detectCsvDelimiter(fileBuffer);
        await new Promise((resolve, reject) => {
            stream_1.Readable.from(fileBuffer)
                .pipe((0, csv_parser_1.default)({
                separator: delimiter,
                mapHeaders: ({ header }) => (header || '')
                    .replace(/^\uFEFF/, '')
                    .trim(),
                mapValues: ({ value }) => (typeof value === 'string' ? value.trim() : value),
            }))
                .on('data', (row) => rows.push(row))
                .on('end', () => resolve())
                .on('error', (error) => reject(error));
        });
        this.logger.log(`[Bulk Upload] CSV parsed with delimiter="${delimiter}"`);
        return rows;
    }
    detectCsvDelimiter(fileBuffer) {
        const preview = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 4096));
        const firstLine = (preview.split(/\r?\n/).find((line) => line.trim().length > 0) || '')
            .replace(/^\uFEFF/, '')
            .trim();
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        return semicolonCount > commaCount ? ';' : ',';
    }
    toOptionalString(value) {
        if (value === null || value === undefined)
            return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    }
    toOptionalBoolean(value) {
        const normalized = this.toOptionalString(value);
        if (!normalized)
            return undefined;
        switch (normalized.toLowerCase()) {
            case 'true':
            case '1':
            case 'yes':
            case 'y':
                return true;
            case 'false':
            case '0':
            case 'no':
            case 'n':
                return false;
            default:
                return undefined;
        }
    }
    async findExistingAccountIds(ids) {
        const existing = new Set();
        const chunkSize = 5000;
        for (let index = 0; index < ids.length; index += chunkSize) {
            const chunk = ids.slice(index, index + chunkSize);
            const found = await this.prisma.accountMapping.findMany({
                where: { b2b_account_id: { in: chunk } },
                select: { b2b_account_id: true },
            });
            for (const row of found) {
                existing.add(row.b2b_account_id);
            }
        }
        return existing;
    }
    async bulkInsertAccountMapping(rows, filename) {
        const failedRows = [];
        const firstSeenRowById = new Map();
        const uniqueCandidates = [];
        rows.forEach((row, index) => {
            const rowNumber = index + 2;
            const b2bAccountId = this.toOptionalString(row.b2b_account_id);
            if (!b2bAccountId) {
                failedRows.push({ rowNumber, reason: 'Missing b2b_account_id' });
                return;
            }
            uniqueCandidates.push({
                rowNumber,
                b2b_account_id: b2bAccountId,
                corporateName: this.toOptionalString(row.corporateName),
                kategoriAccount: this.toOptionalString(row.kategoriAccount),
                group: this.toOptionalString(row.group),
                divisi: this.toOptionalString(row.divisi),
                department: this.toOptionalString(row.department),
                mppCodeNew: this.toOptionalString(row.mppCodeNew),
                namaAM: this.toOptionalString(row.namaAM),
            });
        });
        if (!uniqueCandidates.length) {
            throw new common_1.BadRequestException('No valid rows found. b2b_account_id is required');
        }
        const existingIds = await this.findExistingAccountIds(uniqueCandidates.map((item) => item.b2b_account_id));
        const rowsToInsert = [];
        for (const item of uniqueCandidates) {
            rowsToInsert.push({
                b2b_account_id: item.b2b_account_id,
                corporateName: item.corporateName,
                kategoriAccount: item.kategoriAccount,
                group: item.group,
                divisi: item.divisi,
                department: item.department,
                mppCodeNew: item.mppCodeNew,
                namaAM: item.namaAM,
            });
        }
        if (!rowsToInsert.length) {
            return {
                lookupType: 'account-mapping',
                filename,
                totalRows: rows.length,
                insertedRows: 0,
                failedRowsCount: failedRows.length,
                skippedInvalidRows: failedRows.filter((item) => item.reason === 'Missing b2b_account_id')
                    .length,
                skippedDuplicateRows: failedRows.length,
                failedRows,
            };
        }
        const created = await this.prisma.accountMapping.createMany({
            data: rowsToInsert,
            skipDuplicates: true,
        });
        const skippedFromInsert = rowsToInsert.length - created.count;
        if (skippedFromInsert > 0) {
            failedRows.push({
                rowNumber: 0,
                reason: `${skippedFromInsert} row(s) skipped during insert due to concurrent duplicate conflict`,
            });
        }
        const summary = {
            lookupType: 'account-mapping',
            filename,
            totalRows: rows.length,
            insertedRows: created.count,
            failedRowsCount: failedRows.length,
            skippedInvalidRows: failedRows.filter((item) => item.reason === 'Missing b2b_account_id')
                .length,
            skippedDuplicateRows: failedRows.filter((item) => item.reason.includes('Duplicate b2b_account_id in CSV') ||
                item.reason === 'b2b_account_id already exists in database' ||
                item.reason.includes('concurrent duplicate conflict')).length,
            failedRows,
        };
        this.logger.log(`[Bulk Upload][account-mapping] file=${filename ?? 'unknown'} detected=${summary.totalRows} inserted=${summary.insertedRows} failed=${summary.failedRowsCount}`);
        return summary;
    }
    async bulkInsertLookupKip(rows, filename) {
        const failedRows = [];
        const mappedRows = rows
            .map((row, index) => {
            const mapped = {
                category: this.toOptionalString(row.category),
                subCategory: this.toOptionalString(row.subCategory),
                detailCategoryFull: this.toOptionalString(row.detailCategoryFull),
                detailCategory: this.toOptionalString(row.detailCategory),
                detailCategory2: this.toOptionalString(row.detailCategory2),
                compositeKeyOmnix: this.toOptionalString(row.compositeKeyOmnix),
                compositeKey: this.toOptionalString(row.compositeKey),
                fcrNonSatuan: this.toOptionalString(row.fcrNonSatuan),
                escToSatuan: this.toOptionalString(row.escToSatuan),
                fcrNonMassal: this.toOptionalString(row.fcrNonMassal),
                escToMassal: this.toOptionalString(row.escToMassal),
                isFcr: this.toOptionalBoolean(row.isFcr),
                product: this.toOptionalString(row.product),
            };
            if (!Object.values(mapped).some((value) => value !== undefined)) {
                failedRows.push({ rowNumber: index + 2, reason: 'Empty/invalid row' });
            }
            return mapped;
        })
            .filter((row) => Object.values(row).some((value) => value !== undefined));
        if (!mappedRows.length) {
            throw new common_1.BadRequestException('No valid rows found in CSV file');
        }
        const created = await this.prisma.lookupKIP.createMany({
            data: mappedRows,
        });
        const summary = {
            lookupType: 'lookup-kip',
            filename,
            totalRows: rows.length,
            insertedRows: created.count,
            failedRowsCount: failedRows.length,
            skippedInvalidRows: failedRows.length,
            failedRows,
        };
        this.logger.log(`[Bulk Upload][lookup-kip] file=${filename ?? 'unknown'} detected=${summary.totalRows} inserted=${summary.insertedRows} failed=${summary.failedRowsCount}`);
        return summary;
    }
    async bulkInsertLookupAgent(rows, filename) {
        const failedRows = [];
        const mappedRows = rows
            .map((row, index) => {
            const mapped = {
                namaAgent: this.toOptionalString(row.nama_agent),
                group: this.toOptionalString(row.group),
            };
            if (!Object.values(mapped).some((value) => value !== undefined)) {
                failedRows.push({ rowNumber: index + 2, reason: 'Empty/invalid row' });
            }
            return mapped;
        })
            .filter((row) => Object.values(row).some((value) => value !== undefined));
        if (!mappedRows.length) {
            throw new common_1.BadRequestException('No valid rows found in CSV file');
        }
        const created = await this.prisma.lookupAgent.createMany({
            data: mappedRows,
        });
        const summary = {
            lookupType: 'lookup-agent',
            filename,
            totalRows: rows.length,
            insertedRows: created.count,
            failedRowsCount: failedRows.length,
            skippedInvalidRows: failedRows.length,
            failedRows,
        };
        this.logger.log(`[Bulk Upload][lookup-agent] file=${filename ?? 'unknown'} detected=${summary.totalRows} inserted=${summary.insertedRows} failed=${summary.failedRowsCount}`);
        return summary;
    }
    async findAllAccountMappings(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 25);
        const skip = (page - 1) * limit;
        const where = {};
        if (query.search) {
            where.OR = [
                { corporateName: { contains: query.search, mode: 'insensitive' } },
                { b2b_account_id: { contains: query.search, mode: 'insensitive' } },
                { namaAM: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.filters) {
            try {
                const parsedFilters = JSON.parse(query.filters);
                const andConditions = [];
                const whitelist = ['b2b_account_id', 'corporateName', 'kategoriAccount', 'group', 'divisi', 'department', 'mppCodeNew', 'namaAM'];
                for (const [key, value] of Object.entries(parsedFilters)) {
                    if (whitelist.includes(key) && value !== null && value !== undefined && value !== '') {
                        if (typeof value === 'boolean') {
                            andConditions.push({ [key]: value });
                        }
                        else if (Array.isArray(value)) {
                            if (value.length > 0) {
                                andConditions.push({ [key]: { in: value } });
                            }
                        }
                        else {
                            const tokens = String(value).trim().split(/\s+/).filter(Boolean);
                            if (tokens.length > 0) {
                                tokens.forEach((token) => {
                                    andConditions.push({ [key]: { contains: token, mode: 'insensitive' } });
                                });
                            }
                        }
                    }
                }
                if (andConditions.length > 0) {
                    where.AND = andConditions;
                }
            }
            catch (e) {
                this.logger.warn(`Failed to parse filters for account-mapping: ${query.filters}`);
            }
        }
        const [total, data, uniqueCategories, uniqueGroups, uniqueDivisi, uniqueDept] = await Promise.all([
            this.prisma.accountMapping.count({ where }),
            this.prisma.accountMapping.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
            this.prisma.accountMapping.findMany({
                distinct: ['kategoriAccount'],
                select: { kategoriAccount: true },
                where: {
                    kategoriAccount: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { kategoriAccount: 'asc' },
            }),
            this.prisma.accountMapping.findMany({
                distinct: ['group'],
                select: { group: true },
                where: {
                    group: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { group: 'asc' },
            }),
            this.prisma.accountMapping.findMany({
                distinct: ['divisi'],
                select: { divisi: true },
                where: {
                    divisi: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { divisi: 'asc' },
            }),
            this.prisma.accountMapping.findMany({
                distinct: ['department'],
                select: { department: true },
                where: {
                    department: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { department: 'asc' },
            }),
        ]);
        const filterOptions = {
            kategoriAccount: uniqueCategories.map((c) => c.kategoriAccount).filter(Boolean),
            group: uniqueGroups.map((g) => g.group).filter(Boolean),
            divisi: uniqueDivisi.map((d) => d.divisi).filter(Boolean),
            department: uniqueDept.map((dp) => dp.department).filter(Boolean),
        };
        return {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
                filterOptions,
            },
        };
    }
    async createAccountMapping(dto) {
        return this.prisma.accountMapping.create({ data: dto });
    }
    async updateAccountMapping(id, dto) {
        const existing = await this.prisma.accountMapping.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('AccountMapping not found');
        return this.prisma.accountMapping.update({ where: { id }, data: dto });
    }
    async deleteAccountMapping(id) {
        const existing = await this.prisma.accountMapping.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('AccountMapping not found');
        return this.prisma.accountMapping.delete({ where: { id } });
    }
    async deleteAllAccountMappings() {
        return this.prisma.accountMapping.deleteMany();
    }
    async findAllLookupKIP(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 25);
        const skip = (page - 1) * limit;
        const where = {};
        if (query.search) {
            where.OR = [
                { category: { contains: query.search, mode: 'insensitive' } },
                { subCategory: { contains: query.search, mode: 'insensitive' } },
                { detailCategory: { contains: query.search, mode: 'insensitive' } },
                { product: { contains: query.search, mode: 'insensitive' } },
                { compositeKey: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.filters) {
            try {
                const parsedFilters = JSON.parse(query.filters);
                const andConditions = [];
                const whitelist = [
                    'category',
                    'subCategory',
                    'detailCategoryFull',
                    'detailCategory',
                    'detailCategory2',
                    'compositeKeyOmnix',
                    'compositeKey',
                    'fcrNonSatuan',
                    'escToSatuan',
                    'fcrNonMassal',
                    'escToMassal',
                    'isFcr',
                    'product',
                ];
                for (const [key, value] of Object.entries(parsedFilters)) {
                    if (whitelist.includes(key) && value !== null && value !== undefined && value !== '') {
                        if (typeof value === 'boolean') {
                            andConditions.push({ [key]: value });
                        }
                        else if (key === 'isFcr') {
                            if (value === 'true' || value === '1') {
                                andConditions.push({ [key]: true });
                            }
                            else if (value === 'false' || value === '0') {
                                andConditions.push({ [key]: false });
                            }
                            else if (Array.isArray(value)) {
                                const mappedBools = value.map(v => v === 'true' || v === true);
                                if (mappedBools.length > 0) {
                                    andConditions.push({ [key]: { in: mappedBools } });
                                }
                            }
                        }
                        else if (Array.isArray(value)) {
                            if (value.length > 0) {
                                andConditions.push({ [key]: { in: value } });
                            }
                        }
                        else {
                            const tokens = String(value).trim().split(/\s+/).filter(Boolean);
                            if (tokens.length > 0) {
                                tokens.forEach((token) => {
                                    andConditions.push({ [key]: { contains: token, mode: 'insensitive' } });
                                });
                            }
                        }
                    }
                }
                if (andConditions.length > 0) {
                    where.AND = andConditions;
                }
            }
            catch (e) {
                this.logger.warn(`Failed to parse filters for lookup-kip: ${query.filters}`);
            }
        }
        const [total, data, uniqueCategories, uniqueProducts, uniqueEscToSatuan, uniqueEscToMassal,] = await Promise.all([
            this.prisma.lookupKIP.count({ where }),
            this.prisma.lookupKIP.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
            this.prisma.lookupKIP.findMany({
                distinct: ['category'],
                select: { category: true },
                where: {
                    category: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { category: 'asc' },
            }),
            this.prisma.lookupKIP.findMany({
                distinct: ['product'],
                select: { product: true },
                where: {
                    product: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { product: 'asc' },
            }),
            this.prisma.lookupKIP.findMany({
                distinct: ['escToSatuan'],
                select: { escToSatuan: true },
                where: {
                    escToSatuan: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { escToSatuan: 'asc' },
            }),
            this.prisma.lookupKIP.findMany({
                distinct: ['escToMassal'],
                select: { escToMassal: true },
                where: {
                    escToMassal: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { escToMassal: 'asc' },
            }),
        ]);
        const filterOptions = {
            category: uniqueCategories.map((c) => c.category).filter(Boolean),
            product: uniqueProducts.map((p) => p.product).filter(Boolean),
            escToSatuan: uniqueEscToSatuan.map((s) => s.escToSatuan).filter(Boolean),
            escToMassal: uniqueEscToMassal.map((m) => m.escToMassal).filter(Boolean),
        };
        return {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
                filterOptions,
            },
        };
    }
    async createLookupKIP(dto) {
        return this.prisma.lookupKIP.create({ data: dto });
    }
    async updateLookupKIP(id, dto) {
        const existing = await this.prisma.lookupKIP.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('LookupKIP not found');
        return this.prisma.lookupKIP.update({ where: { id }, data: dto });
    }
    async deleteLookupKIP(id) {
        const existing = await this.prisma.lookupKIP.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('LookupKIP not found');
        return this.prisma.lookupKIP.delete({ where: { id } });
    }
    async deleteAllLookupKIP() {
        return this.prisma.lookupKIP.deleteMany();
    }
    async findAllLookupAgent(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 25);
        const skip = (page - 1) * limit;
        const where = {};
        if (query.search) {
            where.OR = [
                { namaAgent: { contains: query.search, mode: 'insensitive' } },
                { group: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.filters) {
            try {
                const parsedFilters = JSON.parse(query.filters);
                const andConditions = [];
                const whitelist = ['namaAgent', 'group'];
                for (const [key, value] of Object.entries(parsedFilters)) {
                    if (whitelist.includes(key) && value !== null && value !== undefined && value !== '') {
                        if (typeof value === 'boolean') {
                            andConditions.push({ [key]: value });
                        }
                        else if (Array.isArray(value)) {
                            if (value.length > 0) {
                                andConditions.push({ [key]: { in: value } });
                            }
                        }
                        else {
                            const tokens = String(value).trim().split(/\s+/).filter(Boolean);
                            if (tokens.length > 0) {
                                tokens.forEach((token) => {
                                    andConditions.push({ [key]: { contains: token, mode: 'insensitive' } });
                                });
                            }
                        }
                    }
                }
                if (andConditions.length > 0) {
                    where.AND = andConditions;
                }
            }
            catch (e) {
                this.logger.warn(`Failed to parse filters for lookup-agent: ${query.filters}`);
            }
        }
        const [total, data, uniqueGroups] = await Promise.all([
            this.prisma.lookupAgent.count({ where }),
            this.prisma.lookupAgent.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
            this.prisma.lookupAgent.findMany({
                distinct: ['group'],
                select: { group: true },
                where: {
                    group: {
                        not: null,
                        notIn: [''],
                    },
                },
                orderBy: { group: 'asc' },
            }),
        ]);
        const filterOptions = {
            group: uniqueGroups.map((g) => g.group).filter(Boolean),
        };
        return {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
                filterOptions,
            },
        };
    }
    async createLookupAgent(dto) {
        return this.prisma.lookupAgent.create({ data: dto });
    }
    async updateLookupAgent(id, dto) {
        const existing = await this.prisma.lookupAgent.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('LookupAgent not found');
        return this.prisma.lookupAgent.update({ where: { id }, data: dto });
    }
    async deleteLookupAgent(id) {
        const existing = await this.prisma.lookupAgent.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('LookupAgent not found');
        return this.prisma.lookupAgent.delete({ where: { id } });
    }
    async deleteAllLookupAgent() {
        return this.prisma.lookupAgent.deleteMany();
    }
};
exports.LookupManagementService = LookupManagementService;
exports.LookupManagementService = LookupManagementService = LookupManagementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LookupManagementService);
//# sourceMappingURL=lookup-management.service.js.map