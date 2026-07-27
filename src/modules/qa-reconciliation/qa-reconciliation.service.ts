import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQaReconciliationDto } from './dto/create-qa-reconciliation.dto';
import { UpdateQaReconciliationDto } from './dto/update-qa-reconciliation.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class QaReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreateQaReconciliationDto, user: any) {
    const qaFormTapping = await this.prisma.qaFormTapping.findUnique({
      where: { id: createDto.qaFormTappingId },
    });

    if (!qaFormTapping) {
      throw new NotFoundException('QA Form Tapping not found');
    }

    if (user.role === 'TL' && qaFormTapping.teamLeader !== user.name) {
      throw new ConflictException('Anda tidak berhak mengajukan rekonsiliasi untuk tim ini.');
    }

    const existingPending = await this.prisma.qaReconciliation.findFirst({
      where: {
        qaFormTappingId: createDto.qaFormTappingId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new ConflictException('Rekonsiliasi untuk tiket ini sedang dalam status PENDING.');
    }

    // Force tlName and qcName to prevent spoofing
    createDto.tlName = user.name;
    createDto.qcName = qaFormTapping.tapper;

    const newRekon = await this.prisma.qaReconciliation.create({
      data: createDto,
    });

    // Send notification to QC
    await this.notificationsService.createForUserByName(qaFormTapping.tapper, {
      type: 'QA_REKON_QC',
      title: 'Rekonsiliasi Baru',
      message: `TL ${user.name} mengajukan rekonsiliasi untuk tiket ${qaFormTapping.idTiket}`,
      link: `/quality-assurance/reconciliation`,
    });

    // Send notification to all TL_QC
    await this.notificationsService.createForRole('TL_QC', {
      type: 'QA_REKON_TL_QC',
      title: 'Rekonsiliasi Baru',
      message: `Rekonsiliasi baru diajukan untuk tiket ${qaFormTapping.idTiket}`,
      link: `/quality-assurance/reconciliation`,
    });

    return newRekon;
  }

  async findAll(user: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc', search?: string, status?: string, filters?: string) {
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
      orderBy: sortBy && sortBy !== 'agentName' && sortBy !== 'idTiket' && sortBy !== 'peak' ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
    });

    let resolved = await Promise.all(rekons.map(async (rekon) => {
      const tapping = await this.prisma.qaFormTapping.findUnique({
        where: { id: rekon.qaFormTappingId },
        select: { agent: true, idTiket: true, peak: true },
      });
      return {
        ...rekon,
        agentName: tapping?.agent || '-',
        idTiket: tapping?.idTiket || '-',
        peak: tapping?.peak ? tapping.peak.toString() : null,
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

    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        Object.entries(parsedFilters).forEach(([key, values]: [string, any]) => {
          if (Array.isArray(values) && values.length > 0) {
            resolved = resolved.filter((item: any) => {
              const val = item[key];
              if (val === null || val === undefined) return false;
              return values.some(v => String(val).toLowerCase() === String(v).toLowerCase());
            });
          }
        });
      } catch (e) {
        console.error("Failed to parse filters", e);
      }
    }

    if (sortBy === 'agentName' || sortBy === 'idTiket' || sortBy === 'peak') {
      resolved.sort((a: any, b: any) => {
        const valA = a[sortBy] || '';
        const valB = b[sortBy] || '';
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resolved;
  }

  async exportData(user: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc', search?: string, status?: string, filters?: string) {
    const data = await this.findAll(user, sortBy, sortOrder, search, status, filters);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reconciliation');

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key: key }));
      data.forEach(item => worksheet.addRow(item));
    } else {
      worksheet.columns = [{ header: 'No Data', key: 'no_data' }];
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async findOne(id: string) {
    const rekon = await this.prisma.qaReconciliation.findUnique({
      where: { id },
    });
    if (!rekon) throw new NotFoundException('Reconciliation not found');
    return rekon;
  }

  async approve(id: string, user: any, updateDto: UpdateQaReconciliationDto) {
    const rekon = await this.findOne(id);
    
    if (user.role === 'TL' && user.name === rekon.tlName) {
      throw new ForbiddenException('You cannot approve your own reconciliation request');
    }
    
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

    const updatedRekon = await this.prisma.qaReconciliation.update({
      where: { id },
      data: {
        status: 'APPROVED',
        qcResponseNotes: updateDto.qcResponseNotes,
      },
    });

    const formTapping = await this.prisma.qaFormTapping.findUnique({ where: { id: rekon.qaFormTappingId } });

    // Send notification to TL who proposed
    await this.notificationsService.createForUserByName(rekon.tlName, {
      type: 'QA_REKON_RESULT',
      title: 'Rekonsiliasi Disetujui',
      message: `Rekonsiliasi tiket ${formTapping?.idTiket} telah APPROVED`,
      link: `/quality-assurance/reconciliation`,
    });

    return updatedRekon;
  }

  async reject(id: string, user: any, updateDto: UpdateQaReconciliationDto) {
    const rekon = await this.findOne(id);

    if (user.role === 'TL' && user.name === rekon.tlName) {
      throw new ForbiddenException('You cannot reject your own reconciliation request');
    }

    const updatedRekon = await this.prisma.qaReconciliation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        qcResponseNotes: updateDto.qcResponseNotes,
      },
    });

    const formTapping = await this.prisma.qaFormTapping.findUnique({ where: { id: rekon.qaFormTappingId } });

    // Send notification to TL who proposed
    await this.notificationsService.createForUserByName(rekon.tlName, {
      type: 'QA_REKON_RESULT',
      title: 'Rekonsiliasi Ditolak',
      message: `Rekonsiliasi tiket ${formTapping?.idTiket} telah REJECTED`,
      link: `/quality-assurance/reconciliation`,
    });

    return updatedRekon;
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

  async getNotificationSummary(user: any) {
    const where: any = { status: 'PENDING' };

    if (user.role === 'QC') {
      // QC sees pending rekons assigned to them (need their response)
      where.qcName = user.name;
    } else if (user.role === 'TL') {
      // TL sees their own pending submissions
      where.tlName = user.name;
    }
    // ADMIN and TL_QC see all pending

    const pendingRekon = await this.prisma.qaReconciliation.count({ where });

    // Count agent commitments pending TL approval (for TL role)
    let pendingKomitmen = 0;
    if (user.role === 'TL' || user.role === 'ADMIN' || user.role === 'TL_QC') {
      const komitmenWhere: any = {
        komitmen: { not: null },
        komitmenStatus: 'PENDING',
      };
      if (user.role === 'TL') {
        komitmenWhere.teamLeader = user.name;
      }
      try {
        pendingKomitmen = await this.prisma.qaFormTapping.count({
          where: komitmenWhere,
        });
      } catch (e) {
        pendingKomitmen = 0;
      }
    }

    return {
      pendingRekon,
      pendingKomitmen,
      total: pendingRekon + pendingKomitmen,
    };
  }
}
