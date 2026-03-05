import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateAccountMappingDto,
  UpdateAccountMappingDto,
  CreateLookupKIPDto,
  UpdateLookupKIPDto,
  CreateLookupAgentDto,
  UpdateLookupAgentDto,
  QueryLookupDto,
} from './dto/lookup-management.dto';

@Injectable()
export class LookupManagementService {
  constructor(private prisma: PrismaService) {}

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
