import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Readable } from 'stream';
import csv from 'csv-parser';
import {
  CreateAccountMappingDto,
  UpdateAccountMappingDto,
  CreateLookupKIPDto,
  UpdateLookupKIPDto,
  CreateLookupAgentDto,
  UpdateLookupAgentDto,
  QueryLookupDto,
} from './dto/lookup-management.dto';

type LookupUploadType = 'account-mapping' | 'lookup-kip' | 'lookup-agent';

type FailedRow = {
  rowNumber: number;
  reason: string;
  b2b_account_id?: string;
};

@Injectable()
export class LookupManagementService {
  private readonly logger = new Logger(LookupManagementService.name);

  constructor(private prisma: PrismaService) {}

  async bulkUploadFromCsv(lookupType: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    const normalizedLookupType = lookupType.trim().toLowerCase() as LookupUploadType;
    const validTypes: LookupUploadType[] = [
      'account-mapping',
      'lookup-kip',
      'lookup-agent',
    ];

    if (!validTypes.includes(normalizedLookupType)) {
      throw new BadRequestException(
        `Invalid lookupType. Allowed values: ${validTypes.join(', ')}`,
      );
    }

    const rows = await this.parseCsvRows(file.buffer);
    if (!rows.length) {
      throw new BadRequestException('CSV file is empty or has no data rows');
    }

    switch (normalizedLookupType) {
      case 'account-mapping':
        return this.bulkInsertAccountMapping(rows, file.originalname);
      case 'lookup-kip':
        return this.bulkInsertLookupKip(rows, file.originalname);
      case 'lookup-agent':
        return this.bulkInsertLookupAgent(rows, file.originalname);
      default:
        throw new BadRequestException('Unsupported lookupType');
    }
  }

  private async parseCsvRows(fileBuffer: Buffer): Promise<Record<string, string>[]> {
    const rows: Record<string, string>[] = [];
    const delimiter = this.detectCsvDelimiter(fileBuffer);

    await new Promise<void>((resolve, reject) => {
      Readable.from(fileBuffer)
        .pipe(
          csv({
            separator: delimiter,
            mapHeaders: ({ header }) =>
              (header || '')
                .replace(/^\uFEFF/, '')
                .trim(),
            mapValues: ({ value }) => (typeof value === 'string' ? value.trim() : value),
          }),
        )
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });

    this.logger.log(`[Bulk Upload] CSV parsed with delimiter="${delimiter}"`);

    return rows;
  }

  private detectCsvDelimiter(fileBuffer: Buffer): ',' | ';' {
    const preview = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 4096));
    const firstLine = (preview.split(/\r?\n/).find((line) => line.trim().length > 0) || '')
      .replace(/^\uFEFF/, '')
      .trim();

    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    return semicolonCount > commaCount ? ';' : ',';
  }

  private toOptionalString(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized.length ? normalized : undefined;
  }

  private toOptionalBoolean(value: unknown): boolean | undefined {
    const normalized = this.toOptionalString(value);
    if (!normalized) return undefined;

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

  private async findExistingAccountIds(ids: string[]): Promise<Set<string>> {
    const existing = new Set<string>();
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

  private async bulkInsertAccountMapping(rows: Record<string, string>[], filename?: string) {
    const failedRows: FailedRow[] = [];
    const firstSeenRowById = new Map<string, number>();
    const uniqueCandidates: (Prisma.AccountMappingCreateManyInput & { rowNumber: number })[] =
      [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const b2bAccountId = this.toOptionalString(row.b2b_account_id);

      if (!b2bAccountId) {
        failedRows.push({ rowNumber, reason: 'Missing b2b_account_id' });
        return;
      }

      // const alreadySeenAt = firstSeenRowById.get(b2bAccountId);
      // if (alreadySeenAt) {
      //   failedRows.push({
      //     rowNumber,
      //     reason: `Duplicate b2b_account_id in CSV (first seen at row ${alreadySeenAt})`,
      //     b2b_account_id: b2bAccountId,
      //   });
      //   return;
      // }

      // firstSeenRowById.set(b2bAccountId, rowNumber);
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
      throw new BadRequestException('No valid rows found. b2b_account_id is required');
    }

    const existingIds = await this.findExistingAccountIds(
      uniqueCandidates.map((item) => item.b2b_account_id),
    );

    const rowsToInsert: Prisma.AccountMappingCreateManyInput[] = [];
    for (const item of uniqueCandidates) {
      // if (existingIds.has(item.b2b_account_id)) {
      //   failedRows.push({
      //     rowNumber: item.rowNumber,
      //     reason: 'b2b_account_id already exists in database',
      //     b2b_account_id: item.b2b_account_id,
      //   });
      //   continue;
      // }

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
      skippedDuplicateRows: failedRows.filter(
        (item) =>
          item.reason.includes('Duplicate b2b_account_id in CSV') ||
          item.reason === 'b2b_account_id already exists in database' ||
          item.reason.includes('concurrent duplicate conflict'),
      ).length,
      failedRows,
    };

    this.logger.log(
      `[Bulk Upload][account-mapping] file=${filename ?? 'unknown'} detected=${summary.totalRows} inserted=${summary.insertedRows} failed=${summary.failedRowsCount}`,
    );

    return summary;
  }

  private async bulkInsertLookupKip(rows: Record<string, string>[], filename?: string) {
    const failedRows: { rowNumber: number; reason: string }[] = [];

    const mappedRows: Prisma.LookupKIPCreateManyInput[] = rows
      .map((row, index) => {
        const mapped: Prisma.LookupKIPCreateManyInput = {
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
      throw new BadRequestException('No valid rows found in CSV file');
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

    this.logger.log(
      `[Bulk Upload][lookup-kip] file=${filename ?? 'unknown'} detected=${summary.totalRows} inserted=${summary.insertedRows} failed=${summary.failedRowsCount}`,
    );

    return summary;
  }

  private async bulkInsertLookupAgent(rows: Record<string, string>[], filename?: string) {
    const failedRows: { rowNumber: number; reason: string }[] = [];

    const mappedRows: Prisma.LookupAgentCreateManyInput[] = rows
      .map((row, index) => {
        const mapped: Prisma.LookupAgentCreateManyInput = {
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
      throw new BadRequestException('No valid rows found in CSV file');
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

    this.logger.log(
      `[Bulk Upload][lookup-agent] file=${filename ?? 'unknown'} detected=${summary.totalRows} inserted=${summary.insertedRows} failed=${summary.failedRowsCount}`,
    );

    return summary;
  }

  // ═══════════════════════════════════════════
  //  AccountMapping
  // ═══════════════════════════════════════════

  async findAllAccountMappings(query: QueryLookupDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const skip = (page - 1) * limit;

    const where: Prisma.AccountMappingWhereInput = query.search
      ? {
          OR: [
            { corporateName: { contains: query.search, mode: 'insensitive' } },
            { b2b_account_id: { contains: query.search, mode: 'insensitive' } },
            { namaAM: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, data] = await Promise.all([
      this.prisma.accountMapping.count({ where }),
      this.prisma.accountMapping.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async createAccountMapping(dto: CreateAccountMappingDto) {
    return this.prisma.accountMapping.create({ data: dto });
  }

  async updateAccountMapping(id: number, dto: UpdateAccountMappingDto) {
    const existing = await this.prisma.accountMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('AccountMapping not found');
    return this.prisma.accountMapping.update({ where: { id }, data: dto });
  }

  async deleteAccountMapping(id: number) {
    const existing = await this.prisma.accountMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('AccountMapping not found');
    return this.prisma.accountMapping.delete({ where: { id } });
  }

  async deleteAllAccountMappings() {
    return this.prisma.accountMapping.deleteMany();
  }

  // ═══════════════════════════════════════════
  //  LookupKIP
  // ═══════════════════════════════════════════

  async findAllLookupKIP(query: QueryLookupDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const skip = (page - 1) * limit;

    const where: Prisma.LookupKIPWhereInput = query.search
      ? {
          OR: [
            { category: { contains: query.search, mode: 'insensitive' } },
            { subCategory: { contains: query.search, mode: 'insensitive' } },
            { detailCategory: { contains: query.search, mode: 'insensitive' } },
            { product: { contains: query.search, mode: 'insensitive' } },
            { compositeKey: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, data] = await Promise.all([
      this.prisma.lookupKIP.count({ where }),
      this.prisma.lookupKIP.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async createLookupKIP(dto: CreateLookupKIPDto) {
    return this.prisma.lookupKIP.create({ data: dto });
  }

  async updateLookupKIP(id: number, dto: UpdateLookupKIPDto) {
    const existing = await this.prisma.lookupKIP.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('LookupKIP not found');
    return this.prisma.lookupKIP.update({ where: { id }, data: dto });
  }

  async deleteLookupKIP(id: number) {
    const existing = await this.prisma.lookupKIP.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('LookupKIP not found');
    return this.prisma.lookupKIP.delete({ where: { id } });
  }

  async deleteAllLookupKIP() {
    return this.prisma.lookupKIP.deleteMany();
  }

  // ═══════════════════════════════════════════
  //  LookupAgent
  // ═══════════════════════════════════════════

  async findAllLookupAgent(query: QueryLookupDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const skip = (page - 1) * limit;

    const where: Prisma.LookupAgentWhereInput = query.search
      ? {
          OR: [
            { namaAgent: { contains: query.search, mode: 'insensitive' } },
            { group: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, data] = await Promise.all([
      this.prisma.lookupAgent.count({ where }),
      this.prisma.lookupAgent.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async createLookupAgent(dto: CreateLookupAgentDto) {
    return this.prisma.lookupAgent.create({ data: dto });
  }

  async updateLookupAgent(id: number, dto: UpdateLookupAgentDto) {
    const existing = await this.prisma.lookupAgent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('LookupAgent not found');
    return this.prisma.lookupAgent.update({ where: { id }, data: dto });
  }

  async deleteLookupAgent(id: number) {
    const existing = await this.prisma.lookupAgent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('LookupAgent not found');
    return this.prisma.lookupAgent.delete({ where: { id } });
  }

  async deleteAllLookupAgent() {
    return this.prisma.lookupAgent.deleteMany();
  }
}
