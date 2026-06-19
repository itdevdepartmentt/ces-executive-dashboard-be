import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSurveyFieldDto } from './dto/create-survey-field.dto';
import { UpdateSurveyFieldDto } from './dto/update-survey-field.dto';
import { SubmitSurveyDto } from './dto/submit-survey.dto';
import { QuerySurveyDto } from './dto/query-survey.dto';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';
import moment from 'moment-timezone';

@Injectable()
export class SurveyService {
  constructor(private prisma: PrismaService) {}

  async getActiveFields() {
    return this.prisma.surveyField.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async getAllFields(query: QuerySurveyDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.surveyField.findMany({
        skip,
        take: limit,
        orderBy: { order: 'asc' },
      }),
      this.prisma.surveyField.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async createField(dto: CreateSurveyFieldDto) {
    return this.prisma.surveyField.create({
      data: {
        label: dto.label,
        type: dto.type,
        options: dto.options || null,
        isRequired: dto.isRequired ?? true,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
        dependsOnFieldId: dto.dependsOnFieldId || null,
        dependsOnValue: dto.dependsOnValue || null,
      },
    });
  }

  async updateField(id: number, dto: UpdateSurveyFieldDto) {
    return this.prisma.surveyField.update({
      where: { id },
      data: {
        label: dto.label,
        type: dto.type,
        options: dto.options,
        isRequired: dto.isRequired,
        order: dto.order,
        isActive: dto.isActive,
        dependsOnFieldId: dto.dependsOnFieldId,
        dependsOnValue: dto.dependsOnValue,
      },
    });
  }

  async deleteField(id: number) {
    return this.prisma.surveyField.delete({
      where: { id },
    });
  }

  async checkSubmission(ticketId: string) {
    if (!ticketId) return { hasSubmitted: false, isExpired: false, generatedAt: null };
    const existing = await this.prisma.surveyResponse.findFirst({
      where: { ticketId },
    });
    
    if (!existing) {
      return { hasSubmitted: false, isExpired: false, generatedAt: null };
    }

    const answersKeys = Object.keys(existing.answers as any || {});
    const hasSubmitted = answersKeys.length > 0;
    
    // Check 24 hour expiry
    const isExpired = existing.generatedAt 
      ? (Date.now() - new Date(existing.generatedAt).getTime() > 24 * 60 * 60 * 1000)
      : false;

    return { 
      hasSubmitted, 
      isExpired, 
      generatedAt: existing.generatedAt 
    };
  }

  async generateLink(ticketId: string, agentNameParam?: string) {
    const existing = await this.prisma.surveyResponse.findFirst({
      where: { ticketId },
    });

    // If it exists and already has answers, it is submitted
    if (existing && Object.keys(existing.answers as any || {}).length > 0) {
      throw new ConflictException('Survey for this ticket has already been submitted.');
    }

    let finalAgentName = agentNameParam || null;
    if (!finalAgentName) {
      const ticketInfo = await this.checkAgentByTicketId(ticketId);
      finalAgentName = ticketInfo.agentName;
    }

    if (existing) {
      // Update the generated time to now to reset the 24h window
      return this.prisma.surveyResponse.update({
        where: { id: existing.id },
        data: {
          generatedAt: new Date(),
          agentName: finalAgentName,
        }
      });
    }

    // Create a new empty row
    return this.prisma.surveyResponse.create({
      data: {
        ticketId,
        agentName: finalAgentName,
        generatedAt: new Date(),
        answers: {},
      }
    });
  }

  async checkAgentByTicketId(ticketId: string) {
    if (!ticketId) return { agentName: null, generatedAt: null };

    // Search OCA
    const ocaTicket = await this.prisma.rawOca.findUnique({
      where: { ticketNumber: ticketId },
      select: { assignee: true, ticketCreated: true }
    });

    if (ocaTicket && ocaTicket.assignee) {
      return { agentName: ocaTicket.assignee, generatedAt: ocaTicket.ticketCreated };
    }

    // Search Omnix
    const numTicketId = Number(ticketId);
    if (!isNaN(numTicketId) && numTicketId <= 2147483647 && numTicketId >= -2147483648) {
      const omnixTicket = await this.prisma.rawOmnix.findUnique({
        where: { ticketId: numTicketId },
        select: { createdByName: true, updatedByName: true, dateCreatedAt: true }
      });
      if (omnixTicket) {
        const agent = omnixTicket.createdByName || omnixTicket.updatedByName || null;
        if (agent) return { agentName: agent, generatedAt: omnixTicket.dateCreatedAt };
      }
    }

    // Search Call
    const callTicket = await this.prisma.rawCall.findUnique({
      where: { kipId: ticketId },
      select: { employeeName: true, updateStamp: true }
    });

    if (callTicket && callTicket.employeeName) {
      return { agentName: callTicket.employeeName, generatedAt: callTicket.updateStamp };
    }

    return { agentName: null, generatedAt: null };
  }

  async submitResponse(dto: SubmitSurveyDto) {
    if (!dto.ticketId) {
      // Should not happen based on frontend but fallback
      return this.prisma.surveyResponse.create({
        data: {
          agentName: dto.agentName,
          generatedAt: dto.generatedAt ? new Date(dto.generatedAt) : null,
          answers: dto.answers,
        },
      });
    }

    const existing = await this.prisma.surveyResponse.findFirst({
      where: { ticketId: dto.ticketId },
    });

    if (existing) {
      if (Object.keys(existing.answers as any || {}).length > 0) {
        throw new ConflictException('Survey for this ticket has already been submitted.');
      }
      
      // Expired check just in case they bypass frontend
      if (existing.generatedAt && (Date.now() - new Date(existing.generatedAt).getTime() > 24 * 60 * 60 * 1000)) {
        throw new ConflictException('Survey link has expired.');
      }

      return this.prisma.surveyResponse.update({
        where: { id: existing.id },
        data: {
          answers: dto.answers,
          createdAt: new Date(), // Set Answered_time to now
        },
      });
    }

    // Fallback if not generated through our system
    let agentName = dto.agentName || null;
    let generatedAt = dto.generatedAt ? new Date(dto.generatedAt) : null;

    if (!agentName || !generatedAt) {
      const ticketInfo = await this.checkAgentByTicketId(dto.ticketId);
      if (!agentName && ticketInfo.agentName) agentName = ticketInfo.agentName;
      if (!generatedAt && ticketInfo.generatedAt) generatedAt = ticketInfo.generatedAt;
    }

    return this.prisma.surveyResponse.create({
      data: {
        ticketId: dto.ticketId,
        agentName: agentName,
        generatedAt: generatedAt,
        answers: dto.answers,
      },
    });
  }

  async getResponses(query: QuerySurveyDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { respondentName: { contains: query.search, mode: 'insensitive' } },
        { respondentEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.surveyResponse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.surveyResponse.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async downloadResponses(res: Response) {
    const fields = await this.prisma.surveyField.findMany({ orderBy: { order: 'asc' } });
    const responses = await this.prisma.surveyResponse.findMany({ orderBy: { createdAt: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Survey Responses');

    // Build columns
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Waktu Generate', key: 'generatedAt', width: 25 },
      { header: 'Answered_time', key: 'createdAt', width: 25 },
      { header: 'Ticket-ID', key: 'ticketId', width: 15 },
      { header: 'Nama Agent', key: 'agentName', width: 20 },
      ...fields.map(f => ({ header: f.label, key: `field_${f.id}`, width: 20 })),
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    // Add rows
    responses.forEach((r, idx) => {
      const answers = (r.answers as Record<string, any>) || {};
      const hasAnswers = Object.keys(answers).length > 0;
      const row: Record<string, any> = {
        no: idx + 1,
        generatedAt: r.generatedAt ? moment(r.generatedAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss') : '-',
        createdAt: hasAnswers ? moment(r.createdAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss') : '-',
        ticketId: r.ticketId || '-',
        agentName: r.agentName || '-',
      };
      fields.forEach(f => {
        row[`field_${f.id}`] = answers[String(f.id)] ?? '-';
      });
      sheet.addRow(row);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=survey-responses.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  }
}
