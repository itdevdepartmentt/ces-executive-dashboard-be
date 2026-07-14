import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQaReconciliationDto } from './dto/create-qa-reconciliation.dto';
import { UpdateQaReconciliationDto } from './dto/update-qa-reconciliation.dto';

@Injectable()
export class QaReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateQaReconciliationDto) {
    const existingPending = await this.prisma.qaReconciliation.findFirst({
      where: {
        qaFormTappingId: createDto.qaFormTappingId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new ConflictException('Rekonsiliasi untuk tiket ini sedang dalam status PENDING.');
    }

    return this.prisma.qaReconciliation.create({
      data: createDto,
    });
  }

  async findAll(user: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc', search?: string, status?: string) {
    const where: any = {};
    if (user.role === 'TL') {
      where.tlName = user.name;
    } else if (user.role === 'QC') {
      where.qcName = user.name;
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }

    const rekons = await this.prisma.qaReconciliation.findMany({
      where,
      orderBy: sortBy && sortBy !== 'agentName' && sortBy !== 'idTiket' ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
    });

    let resolved = await Promise.all(rekons.map(async (rekon) => {
      const tapping = await this.prisma.qaFormTapping.findUnique({
        where: { id: rekon.qaFormTappingId },
        select: { agent: true, idTiket: true },
      });
      return {
        ...rekon,
        agentName: tapping?.agent || '-',
        idTiket: tapping?.idTiket || '-',
      };
    }));

    if (search) {
      const lowerSearch = search.toLowerCase();
      resolved = resolved.filter(r => 
        (r.tlName?.toLowerCase() || '').includes(lowerSearch) ||
        (r.qcName?.toLowerCase() || '').includes(lowerSearch) ||
        (r.reason?.toLowerCase() || '').includes(lowerSearch) ||
        (r.agentName?.toLowerCase() || '').includes(lowerSearch) ||
        (r.idTiket?.toLowerCase() || '').includes(lowerSearch)
      );
    }

    if (sortBy === 'agentName' || sortBy === 'idTiket') {
      resolved.sort((a, b) => {
        const valA = a[sortBy] || '';
        const valB = b[sortBy] || '';
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resolved;
  }

  async findOne(id: string) {
    const rekon = await this.prisma.qaReconciliation.findUnique({
      where: { id },
    });
    if (!rekon) throw new NotFoundException('Reconciliation not found');
    return rekon;
  }

  async approve(id: string, updateDto: UpdateQaReconciliationDto) {
    const rekon = await this.findOne(id);
    
    // Update the original QA form tapping score
    await this.prisma.qaFormTapping.update({
      where: { id: rekon.qaFormTappingId },
      data: {
        scoreValiditas: rekon.proposedScoreValiditas ?? undefined,
        scoreServiceLevel: rekon.proposedScoreServiceLevel ?? undefined,
        scoreKalimat: rekon.proposedScoreKalimat ?? undefined,
        scoreResponTime: rekon.proposedScoreResponTime ?? undefined,
        scoreDokumentasi: rekon.proposedScoreDokumentasi ?? undefined,
      },
    });

    return this.prisma.qaReconciliation.update({
      where: { id },
      data: {
        status: 'APPROVED',
        qcResponseNotes: updateDto.qcResponseNotes,
      },
    });
  }

  async reject(id: string, updateDto: UpdateQaReconciliationDto) {
    await this.findOne(id);
    return this.prisma.qaReconciliation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        qcResponseNotes: updateDto.qcResponseNotes,
      },
    });
  }

  async reply(id: string, user: any, message: string) {
    const rekon = await this.findOne(id);
    const discussions = (rekon.discussions as any[]) || [];
    
    discussions.push({
      sender: user.role,
      name: user.name,
      message,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.qaReconciliation.update({
      where: { id },
      data: {
        discussions: discussions,
      },
    });
  }

  async remove(id: string) {
    const rekon = await this.findOne(id);
    return this.prisma.qaReconciliation.delete({
      where: { id: rekon.id },
    });
  }
}
