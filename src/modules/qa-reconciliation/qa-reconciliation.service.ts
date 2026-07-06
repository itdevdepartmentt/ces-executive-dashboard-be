import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQaReconciliationDto } from './dto/create-qa-reconciliation.dto';
import { UpdateQaReconciliationDto } from './dto/update-qa-reconciliation.dto';

@Injectable()
export class QaReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateQaReconciliationDto) {
    return this.prisma.qaReconciliation.create({
      data: createDto,
    });
  }

  async findAll(user: any) {
    const where: any = {};
    if (user.role === 'TL') {
      where.tlName = user.name;
    } else if (user.role === 'QC') {
      where.qcName = user.name;
    }
    return this.prisma.qaReconciliation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
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
}
