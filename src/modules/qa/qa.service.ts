import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, UnauthorizedException, HttpException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import csv from 'csv-parser';
import { Readable } from 'stream';
import * as ExcelJS from 'exceljs';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createFormTapping(data: any) {
    const { qaTicketId, ...formTappingData } = data;

    // Create the QA form tapping
    const formTapping = await this.prisma.qaFormTapping.create({
      data: formTappingData,
    });

    // If it was created from a pending ticket, delete the pending ticket
    if (qaTicketId) {
      await this.prisma.qaTicket.delete({
        where: { id: qaTicketId },
      }).catch(() => {
        // Ignore if not found
      });
    }

    // Calculate total score to determine if it's NC (Non-Compliant)
    const totalScore = 
      (formTapping.scoreValiditas || 0) + 
      (formTapping.scoreServiceLevel || 0) + 
      (formTapping.scoreKalimat || 0) + 
      (formTapping.scoreResponTime || 0) + 
      (formTapping.scoreDokumentasi || 0);

    const isNC = totalScore < 100 && formTapping.status !== 'Cancel';

    console.log(`[QA_SERVICE] Tapping ID: ${formTapping.id}, TotalScore: ${totalScore}, isNC: ${isNC}, TL: ${formTapping.teamLeader}`);

    // Send notification to Agent (ONLY if score < 100 / NC)
    if (formTapping.agent && isNC) {
      await this.notificationsService.createForUserByName(formTapping.agent, {
        type: 'QA_TAPPING_AGENT',
        title: 'Tapping NC Baru',
        message: `Tapping NC baru masuk untuk tiket ${formTapping.idTiket}. Silakan isi komitmen.`,
        link: `/quality-assurance/detail-tapping/${formTapping.id}`,
      });
    }

    // Send notification to TL (ONLY if score < 100 / NC)
    if (formTapping.teamLeader && isNC) {
      await this.notificationsService.createForUserByName(formTapping.teamLeader, {
        type: 'QA_TAPPING_TL',
        title: 'Tapping NC Agent Baru',
        message: `Agent ${formTapping.agent} mendapat tapping NC dari ${formTapping.tapper}. Pantau pengisian komitmennya.`,
        link: `/quality-assurance/detail-tapping/${formTapping.id}`,
      });
    }

    return formTapping;
  }

  async getPendingTickets(page = 1, limit = 10, search?: string, filters?: string, user?: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    try {
      const skip = (page - 1) * limit;

      const andConditions: any[] = [];

      if (user) {
        if (user.role === 'QC') {
          andConditions.push({ tapper: user.name });
        } else if (user.role === 'USER') {
          andConditions.push({ agent: user.name });
        } else if (user.role === 'TL') {
          andConditions.push({ teamLeader: user.name });
        }
      }

      if (search) {
        andConditions.push({
          OR: [
            { idTiket: { contains: search, mode: 'insensitive' } },
            { agent: { contains: search, mode: 'insensitive' } },
            { tapper: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      if (filters) {
        try {
          const parsedFilters = JSON.parse(filters);
          Object.keys(parsedFilters).forEach(key => {
            const val = parsedFilters[key];
            if (val && Array.isArray(val) && val.length > 0) {
              andConditions.push({ [key]: { in: val } });
            } else if (val) {
              andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
            }
          });
        } catch (e) {}
      }

      const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

      const [total, data] = await Promise.all([
        this.prisma.qaTicket.count({ where: whereClause }),
        this.prisma.qaTicket.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        }),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (e: any) {
      console.error('CRITICAL ERROR IN getPendingTickets:', e);
      throw new HttpException({ 
        success: false, 
        message: 'Error from getPendingTickets',
        detail: e.message || e.toString(),
        stack: e.stack
      }, 500);
    }
  }

  async getAllFormTapping(page = 1, limit = 10, search?: string, filters?: string, user?: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const skip = (page - 1) * limit;
    
    const andConditions: any[] = [];
    
    if (user) {
      if (user.role === 'QC') {
        andConditions.push({ tapper: user.name });
      } else if (user.role === 'USER') {
        andConditions.push({ agent: user.name });
      } else if (user.role === 'TL') {
        andConditions.push({ teamLeader: user.name });
      }
    }

    if (search) {
      andConditions.push({
        OR: [
          { idTiket: { contains: search, mode: 'insensitive' } },
          { agent: { contains: search, mode: 'insensitive' } },
          { tapper: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        Object.keys(parsedFilters).forEach(key => {
          const val = parsedFilters[key];
          if (val && Array.isArray(val) && val.length > 0) {
            andConditions.push({ [key]: { in: val } });
          } else if (val) {
            andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
          }
        });
      } catch (e) {}
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const [data, total] = await Promise.all([
      this.prisma.qaFormTapping.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      this.prisma.qaFormTapping.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // --- History Tapping Bulk Import/Export ---
  async exportHistoryTappingTemplate() {
    const headers = [
      'idTiket', 'tapper', 'agent', 'teamLeader', 'channel', 'jenisInteraksi', 
      'kipLevel2', 'kipLevel3', 'inOutSla', 'projectId', 'perusahaan', 
      'customerRequests', 'agentResponse', 'handlingTime', 'scoreValiditas', 
      'scoreServiceLevel', 'scoreKalimat', 'scoreResponTime', 'scoreDokumentasi', 
      'status', 'solusi', 'notes', 'parameterPenilaian', 'subParameterPenilaian', 'peak'
    ];
    return headers.join(',') + '\n'; // Return as raw CSV string
  }

  async uploadHistoryTapping(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const results: any[] = [];
    return new Promise((resolve, reject) => {
      Readable.from(file.buffer)
        .pipe(csv())
        .on('data', (data) => {
          // Normalize keys to lowercase for robust matching
          const normalizedData: any = {};
          for (const key in data) {
            normalizedData[key.trim().toLowerCase()] = data[key];
          }

          if (normalizedData.idtiket || normalizedData['id tiket'] || normalizedData.ticketid) {
            results.push({
              idTiket: normalizedData.idtiket || normalizedData['id tiket'] || normalizedData.ticketid || '',
              tapper: normalizedData.tapper || normalizedData.qc || normalizedData.qa || '',
              agent: normalizedData.agent || '',
              teamLeader: normalizedData.teamleader || normalizedData['team leader'] || normalizedData.spv || '',
              channel: normalizedData.channel || '',
              jenisInteraksi: normalizedData.jenisinteraksi || normalizedData['jenis interaksi'] || normalizedData.category || '',
              kipLevel2: normalizedData.kiplevel2 || normalizedData['kip level 2'] || normalizedData.subcategory || '',
              kipLevel3: normalizedData.kiplevel3 || normalizedData['kip level 3'] || normalizedData.detailcategory || '',
              inOutSla: normalizedData.inoutsla || normalizedData['in/out sla'] || normalizedData.sla || '',
              projectId: normalizedData.projectid || normalizedData['project id'] || '',
              perusahaan: normalizedData.perusahaan || normalizedData.namaperusahaan || normalizedData.company || '',
              customerRequests: normalizedData.customerrequests || normalizedData['customer requests'] || normalizedData.request || '',
              agentResponse: normalizedData.agentresponse || normalizedData['agent response'] || normalizedData.response || '',
              handlingTime: normalizedData.handlingtime || normalizedData['handling time'] || '',
              scoreValiditas: parseInt(normalizedData.scorevaliditas || normalizedData['score validitas'] || '0') || 0,
              scoreServiceLevel: parseInt(normalizedData.scoreservicelevel || normalizedData['score service level'] || '0') || 0,
              scoreKalimat: parseInt(normalizedData.scorekalimat || normalizedData['score kalimat'] || '0') || 0,
              scoreResponTime: parseInt(normalizedData.scorerespontime || normalizedData['score respon time'] || '0') || 0,
              scoreDokumentasi: parseInt(normalizedData.scoredokumentasi || normalizedData['score dokumentasi'] || '0') || 0,
              status: normalizedData.status || 'Sample',
              solusi: normalizedData.solusi || '',
              notes: normalizedData.notes || '',
              parameterPenilaian: normalizedData.parameterpenilaian || normalizedData['parameter penilaian'] || '',
              subParameterPenilaian: normalizedData.subparameterpenilaian || normalizedData['sub parameter penilaian'] || '',
              peak: parseInt(normalizedData.peak || '3') || 3,
              msisdn: normalizedData.msisdn || normalizedData.jumlahmsisdn || '',
              createdTicket: normalizedData.ticketcreated || normalizedData['created ticket'] ? new Date(normalizedData.ticketcreated || normalizedData['created ticket']) : null,
            });
          }
        })
        .on('end', async () => {
          try {
            const uniqueResultsMap = new Map();
            results.forEach(item => {
              if (item.idTiket) {
                uniqueResultsMap.set(item.idTiket, item);
              }
            });
            const finalBatch = Array.from(uniqueResultsMap.values());

            let newCount = 0;
            let updateCount = 0;

            for (const item of finalBatch) {
              const existing = await this.prisma.qaFormTapping.findFirst({
                where: { idTiket: item.idTiket }
              });

              if (existing) {
                await this.prisma.qaFormTapping.update({
                  where: { id: existing.id },
                  data: item
                });
                updateCount++;
              } else {
                await this.prisma.qaFormTapping.create({
                  data: item
                });
                newCount++;
              }
              
              // Clean up pending tickets if they are now tapped
              await this.prisma.qaTicket.deleteMany({
                where: { idTiket: item.idTiket }
              });
            }

            resolve({ 
              message: `Successfully processed ${finalBatch.length} History Tapping records! (${newCount} inserted, ${updateCount} updated)`, 
              count: finalBatch.length,
            });
          } catch (error) {
            console.error('History Upload Error:', error);
            reject(new BadRequestException('Failed to process history tapping'));
          }
        })
        .on('error', (error) => {
          reject(new BadRequestException('Error parsing CSV file'));
        });
    });
  }

  async getHistoryFilterOptions(user?: any) {
    const whereClause: any = {};

    if (user?.role === 'USER') {
      whereClause.agent = user.name;
    } else if (user?.role === 'QC') {
      whereClause.tapper = user.name;
    } else if (user?.role === 'TL') {
      whereClause.teamLeader = user.name;
    }

    const tappers = await this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['tapper'], select: { tapper: true } });
    const agents = await this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['agent'], select: { agent: true } });
    const channels = await this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['channel'], select: { channel: true } });
    const kipLevel2s = await this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['kipLevel2'], select: { kipLevel2: true } });
    const kipLevel3s = await this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['kipLevel3'], select: { kipLevel3: true } });
    const jenisInteraksis = await this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['jenisInteraksi'], select: { jenisInteraksi: true } });
    const inOutSlas = await this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['inOutSla'], select: { inOutSla: true } });
    const teamLeaders = await this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['teamLeader'], select: { teamLeader: true } });

    return {
      tapper: tappers.map(t => t.tapper).filter(Boolean),
      agent: agents.map(a => a.agent).filter(Boolean),
      channel: channels.map(c => c.channel).filter(Boolean),
      kipLevel2: kipLevel2s.map(k => k.kipLevel2).filter(Boolean),
      kipLevel3: kipLevel3s.map(k => k.kipLevel3).filter(Boolean),
      jenisInteraksi: jenisInteraksis.map(j => j.jenisInteraksi).filter(Boolean),
      inOutSla: inOutSlas.map(s => s.inOutSla).filter(Boolean),
      teamLeader: teamLeaders.map(t => t.teamLeader).filter(Boolean),
    };
  }

  async exportAllFormTapping(search?: string, filters?: string, user?: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const andConditions: any[] = [];
    
    if (user) {
      if (user.role === 'QC') {
        andConditions.push({ tapper: user.name });
      } else if (user.role === 'USER') {
        andConditions.push({ agent: user.name });
      } else if (user.role === 'TL') {
        andConditions.push({ teamLeader: user.name });
      }
    }

    if (search) {
      andConditions.push({
        OR: [
          { idTiket: { contains: search, mode: 'insensitive' } },
          { agent: { contains: search, mode: 'insensitive' } },
          { tapper: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        Object.keys(parsedFilters).forEach(key => {
          const val = parsedFilters[key];
          if (val && Array.isArray(val) && val.length > 0) {
            andConditions.push({ [key]: { in: val } });
          } else if (val) {
            andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
          }
        });
      } catch (e) {}
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    return this.prisma.qaFormTapping.findMany({
      where: whereClause,
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
    });
  }

  async getFormTappingById(id: string) {
    const form = await this.prisma.qaFormTapping.findUnique({
      where: { id },
    });
    if (!form) {
      throw new NotFoundException('QA Form Tapping not found');
    }
    return form;
  }

  async updateFormTapping(id: string, data: any) {
    const form = await this.prisma.qaFormTapping.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('QA Form Tapping not found');

    return this.prisma.qaFormTapping.update({
      where: { id },
      data,
    });
  }

  async deleteFormTapping(id: string) {
    const form = await this.prisma.qaFormTapping.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('QA Form Tapping not found');

    return this.prisma.qaFormTapping.delete({
      where: { id },
    });
  }

  // --- QaTicket (Pending Tickets) ---



  async getTicketFilterOptions(user?: any) {
    let whereClause: any = {};
    if (user?.role === 'USER') {
      whereClause.agent = user.name;
    } else if (user?.role === 'QC') {
      whereClause.tapper = user.name;
    } else if (user?.role === 'TL') {
      whereClause.teamLeader = user.name;
    }

    const tappers = await this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['tapper'], select: { tapper: true } });
    const agents = await this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['agent'], select: { agent: true } });
    const channels = await this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['channel'], select: { channel: true } });
    const kipLevel2s = await this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['kipLevel2'], select: { kipLevel2: true } });
    const kipLevel3s = await this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['kipLevel3'], select: { kipLevel3: true } });
    const jenisInteraksis = await this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['jenisInteraksi'], select: { jenisInteraksi: true } });
    const inOutSlas = await this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['inOutSla'], select: { inOutSla: true } });
    const teamLeaders = await this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['teamLeader'], select: { teamLeader: true } });

    return {
      tapper: tappers.map(t => t.tapper).filter(Boolean),
      agent: agents.map(a => a.agent).filter(Boolean),
      channel: channels.map(c => c.channel).filter(Boolean),
      kipLevel2: kipLevel2s.map(k => k.kipLevel2).filter(Boolean),
      kipLevel3: kipLevel3s.map(k => k.kipLevel3).filter(Boolean),
      jenisInteraksi: jenisInteraksis.map(j => j.jenisInteraksi).filter(Boolean),
      inOutSla: inOutSlas.map(s => s.inOutSla).filter(Boolean),
      teamLeader: teamLeaders.map(t => t.teamLeader).filter(Boolean),
    };
  }

  async exportPendingTickets(search?: string, filters?: string, user?: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const andConditions: any[] = [];

    if (user) {
      if (user.role === 'QC') {
        andConditions.push({ tapper: user.name });
      } else if (user.role === 'USER') {
        andConditions.push({ agent: user.name });
      } else if (user.role === 'TL') {
        andConditions.push({ teamLeader: user.name });
      }
    }

    if (search) {
      andConditions.push({
        OR: [
          { idTiket: { contains: search, mode: 'insensitive' } },
          { agent: { contains: search, mode: 'insensitive' } },
          { tapper: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        Object.keys(parsedFilters).forEach(key => {
          const val = parsedFilters[key];
          if (val && Array.isArray(val) && val.length > 0) {
            andConditions.push({ [key]: { in: val } });
          } else if (val) {
            andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
          }
        });
      } catch (e) {}
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    return this.prisma.qaTicket.findMany({
      where: whereClause,
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
    });
  }

  async getPendingTicketById(id: string) {
    const ticket = await this.prisma.qaTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Pending QA Ticket with ID ${id} not found`);
    }

    return ticket;
  }

  async deletePendingTicket(id: string) {
    return this.prisma.qaTicket.delete({
      where: { id },
    });
  }

  async uploadTickets(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const results: any[] = [];
    const isXlsx = file.originalname.toLowerCase().endsWith('.xlsx');

    const processRowData = (data: any) => {
      // Normalize keys for robust matching
      const normalizedData: any = {};
      for (const key in data) {
         if (key === undefined || key === null) continue;
         const normKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
         normalizedData[normKey] = data[key];
      }

      // Smart Auto-Detection
      const isMasterAgent = ('namaagent' in normalizedData || 'agentname' in normalizedData) && 
                            ('teamleader' in normalizedData || 'namatl' in normalizedData || 'tapper' in normalizedData) &&
                            !('ticketnumber' in normalizedData) && !('idtiket' in normalizedData);
      
      const isRawDsc = 'all' in normalizedData && 'interactiontype' in normalizedData;

      if (isMasterAgent) {
        results.push({
          namaAgent: String(normalizedData.namaagent || normalizedData.agentname || ''),
          teamLeader: String(normalizedData.teamleader || normalizedData.namatl || normalizedData.tl || ''),
          tapper: String(normalizedData.tapper || normalizedData.namatapper || ''),
        });
        (results as any).isMasterData = true;
      } else if (isRawDsc) {
        results.push({
          idTiket: String(normalizedData.all || ''),
          agent: String(normalizedData.agent || ''),
          tapper: '', 
          teamLeader: String(normalizedData.group || ''),
          channel: String(normalizedData.channel || ''),
          jenisInteraksi: String(normalizedData.interactiontype || ''),
          kipLevel2: String(normalizedData.kiplevel2 || ''),
          kipLevel3: String(normalizedData.kiplevel3 || ''),
          inOutSla: String(normalizedData.inoutsla || ''),
          projectId: String(normalizedData.projectid || ''),
          perusahaan: String(normalizedData.namaperusahaan || normalizedData.companyname || ''),
          customerRequests: String(normalizedData.subject || ''),
          agentResponse: String(normalizedData.notes || ''),
          msisdn: String(normalizedData.msisdn || ''),
          createdTicket: normalizedData.createdtime ? new Date(normalizedData.createdtime) : null,
        });
      } else {
        results.push({
          idTiket: String(normalizedData.ticketnumber || normalizedData.idtiket || normalizedData.ticketid || ''),
          agent: String(normalizedData.resolvedby || normalizedData.assignee || normalizedData.reporter || normalizedData.agent || normalizedData.agentname || ''),
          tapper: String(normalizedData.tapper || normalizedData.qc || normalizedData.qa || ''),
          teamLeader: String(normalizedData.teamleader || normalizedData.tl || normalizedData.spv || normalizedData.supervisor || ''),
          channel: String(normalizedData.channel || ''),
          jenisInteraksi: String(normalizedData.category || normalizedData.jenisinteraksi || normalizedData.interactiontype || ''),
          kipLevel2: String(normalizedData.subcategory || normalizedData.kiplevel2 || ''),
          kipLevel3: String(normalizedData.detailcategory || normalizedData.kiplevel3 || ''),
          inOutSla: String(normalizedData.inoutsla || normalizedData.sla || ''),
          projectId: String(normalizedData.projectid || normalizedData.project || ''),
          perusahaan: String(normalizedData.namaperusahaan || normalizedData.customername || normalizedData.perusahaan || normalizedData.company || ''),
          customerRequests: String(normalizedData.ticketsubject || normalizedData.customerrequests || normalizedData.request || ''),
          agentResponse: String(normalizedData.description || normalizedData.agentresponse || normalizedData.response || ''),
          msisdn: String(normalizedData.msisdn || normalizedData.jumlahmsisdn || ''),
          createdTicket: normalizedData.ticketcreated ? new Date(normalizedData.ticketcreated) : null,
        });
      }
    };

    if (isXlsx) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);
      const worksheet = workbook.worksheets[0];
      
      let headers: string[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          headers = (row.values as any[]).map(h => h ? String(h).trim() : '');
        } else {
          const rowData: any = {};
          (row.values as any[]).forEach((val, idx) => {
             if (headers[idx]) {
                rowData[headers[idx]] = val;
             }
          });
          processRowData(rowData);
        }
      });
    } else {
      const stream = Readable.from(file.buffer);
      const csvString = file.buffer.toString('utf-8');
      const separator = csvString.includes(';') && !csvString.includes(',') ? ';' : ',';
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv({ separator }))
          .on('data', processRowData)
          .on('end', resolve)
          .on('error', reject);
      });
    }

    try {
      if ((results as any).isMasterData) {
         const validAgents = results.filter(r => r.namaAgent);
         
         for (const agent of validAgents) {
           const existing = await this.prisma.lookupAgent.findFirst({
             where: { namaAgent: agent.namaAgent }
           });

           if (existing) {
             await this.prisma.lookupAgent.update({
               where: { id: existing.id },
               data: {
                 teamLeader: agent.teamLeader || existing.teamLeader,
                 tapper: agent.tapper || existing.tapper,
               }
             });
           } else {
             await this.prisma.lookupAgent.create({
               data: {
                 namaAgent: agent.namaAgent,
                 teamLeader: agent.teamLeader,
                 tapper: agent.tapper,
               }
             });
           }
         }
         return { 
           message: `Successfully updated ${validAgents.length} Agent Master Data records!`, 
           count: validAgents.length,
           type: 'master-agent'
         };
      }

      const uniqueResultsMap = new Map();
      results.forEach(item => {
        if (item.idTiket) {
          uniqueResultsMap.set(item.idTiket, item);
        }
      });
      const uniqueResults = Array.from(uniqueResultsMap.values());
      const incomingIds = uniqueResults.map(t => String(t.idTiket));

      const existingPending = await this.prisma.qaTicket.findMany({
        where: { idTiket: { in: incomingIds } },
        select: { idTiket: true }
      });
      const existingPendingIds = new Set(existingPending.map(t => t.idTiket));

      const existingTapped = await this.prisma.qaFormTapping.findMany({
        where: { idTiket: { in: incomingIds } },
        select: { idTiket: true }
      });
      const existingTappedIds = new Set(existingTapped.map(t => t.idTiket));

      const finalBatch = uniqueResults.filter(t => 
        !existingPendingIds.has(String(t.idTiket)) && !existingTappedIds.has(String(t.idTiket))
      );
      
      const BATCH_SIZE = 1000;
      for (let i = 0; i < finalBatch.length; i += BATCH_SIZE) {
        const batch = finalBatch.slice(i, i + BATCH_SIZE);
        await this.prisma.qaTicket.createMany({
          data: batch,
        });
      }
      return { 
        message: `Successfully uploaded ${finalBatch.length} new tickets! (${uniqueResults.length - finalBatch.length} duplicates skipped)`, 
        count: finalBatch.length,
        type: 'ticket-data'
      };
    } catch (error) {
      console.error('Upload Error:', error);
      throw new BadRequestException('Failed to insert tickets into database');
    }
  }
  
  // --- QA Score Dashboard & Detail Tapping ---
  async getQaScoreDashboard(year?: string, month?: string, agent?: string, peak?: string, user?: any, teamLeader?: string) {
    const whereClause: any = {};

    // Date filtering using createdAt
    if (year) {
      const y = parseInt(year);
      const startDate = new Date(y, month ? parseInt(month) - 1 : 0, 1);
      const endDate = month
        ? new Date(y, parseInt(month), 1)
        : new Date(y + 1, 0, 1);
      whereClause.createdAt = { gte: startDate, lt: endDate };
    }

    if (agent) {
      whereClause.agent = agent;
    }

    if (teamLeader) {
      whereClause.teamLeader = teamLeader;
    }

    if (peak) {
      whereClause.peak = parseInt(peak);
    }

    // Fetch all matching form tapping data
    const allData = await this.prisma.qaFormTapping.findMany({
      where: whereClause,
      select: {
        id: true,
        agent: true,
        teamLeader: true,
        tapper: true,
        idTiket: true,
        notes: true,
        scoreValiditas: true,
        scoreServiceLevel: true,
        scoreKalimat: true,
        scoreResponTime: true,
        scoreDokumentasi: true,
        parameterPenilaian: true,
        subParameterPenilaian: true,
        peak: true,
        createdAt: true,
        komitmen: true,
        komitmenStatus: true,
        createdDate: true,
        kipLevel3: true,
        channel: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month for monthly score chart
    const monthlyMap = new Map<number, { totalScore: number; count: number }>();
    const agentMap = new Map<string, { totalScore: number; count: number; ncCount: number }>();
    const teamLeaderMap = new Map<string, { totalScore: number; count: number; ncCount: number }>();
    const paramMonthlyMap = new Map<number, {
      validitas: number; serviceLevel: number; kalimat: number;
      responTime: number; dokumentasi: number; count: number;
    }>();
    const kip3NcMap = new Map<string, number>();

    // NC detail list (tickets where any parameter got less than max)
    const ncDetails: any[] = [];
    const nonNcDetails: any[] = [];

    for (const row of allData) {
      const monthNum = new Date(row.createdAt).getMonth() + 1;
      const totalScore = row.scoreValiditas + row.scoreServiceLevel +
        row.scoreKalimat + row.scoreResponTime + row.scoreDokumentasi;

      // Monthly aggregation
      const existing = monthlyMap.get(monthNum) || { totalScore: 0, count: 0 };
      existing.totalScore += totalScore;
      existing.count += 1;
      monthlyMap.set(monthNum, existing);

      // Agent aggregation
      const agentExisting = agentMap.get(row.agent) || { totalScore: 0, count: 0, ncCount: 0 };
      agentExisting.totalScore += totalScore;
      agentExisting.count += 1;

      // Team Leader aggregation
      const tl = row.teamLeader || 'Unknown';
      const tlExisting = teamLeaderMap.get(tl) || { totalScore: 0, count: 0, ncCount: 0 };
      tlExisting.totalScore += totalScore;
      tlExisting.count += 1;

      // Parameter monthly aggregation
      const paramExisting = paramMonthlyMap.get(monthNum) || {
        validitas: 0, serviceLevel: 0, kalimat: 0,
        responTime: 0, dokumentasi: 0, count: 0,
      };
      paramExisting.validitas += row.scoreValiditas;
      paramExisting.serviceLevel += row.scoreServiceLevel;
      paramExisting.kalimat += row.scoreKalimat;
      paramExisting.responTime += row.scoreResponTime;
      paramExisting.dokumentasi += row.scoreDokumentasi;
      paramExisting.count += 1;
      paramMonthlyMap.set(monthNum, paramExisting);

      // Collect NC details (non-compliant: any score below max)
      const isNC = row.scoreValiditas < 30 || row.scoreServiceLevel < 30 ||
        row.scoreKalimat < 10 || row.scoreResponTime < 15 || row.scoreDokumentasi < 15;
      
      if (isNC) {
        agentExisting.ncCount += 1;
        tlExisting.ncCount += 1;
        
        const kip3 = row.kipLevel3 || 'Unknown';
        kip3NcMap.set(kip3, (kip3NcMap.get(kip3) || 0) + 1);
        
        ncDetails.push({
          id: row.id,
          agent: row.agent,
          teamLeader: row.teamLeader,
          parameterPenilaian: row.parameterPenilaian,
          subParameterPenilaian: row.subParameterPenilaian,
          notes: row.notes,
          createdAt: row.createdAt,
          peak: row.peak,
          idTiket: row.idTiket,
          score: totalScore,
          komitmenStatus: row.komitmenStatus,
          komitmen: (() => {
            const isAgent = user?.name === row.agent;
            const isTl = user?.name === row.teamLeader;
            const isPending = row.komitmenStatus === 'PENDING';
            
            if (isPending && !isAgent && !isTl) {
              return '[Menunggu Approval TL]';
            }
            if (user?.role === 'USER' && !isAgent) {
              return row.komitmen ? '[Komitmen Disembunyikan]' : null;
            }
            return row.komitmen;
          })(),
        });
      } else {
        nonNcDetails.push({
          id: row.id,
          agent: row.agent,
          teamLeader: row.teamLeader,
          tapper: row.tapper,
          createdAt: row.createdAt,
          peak: row.peak,
          idTiket: row.idTiket,
          score: totalScore,
        });
      }
      
      agentMap.set(row.agent, agentExisting);
      teamLeaderMap.set(tl, tlExisting);
    }

    // Format monthly scores
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyScores = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, data]) => ({
        month: monthNames[m - 1],
        monthNum: m,
        avgScore: parseFloat((data.totalScore / data.count).toFixed(2)),
        count: data.count,
      }));

    // Format agent ranking
    const agentRanking = Array.from(agentMap.entries())
      .map(([name, data]) => ({
        agent: name,
        sampling: data.count,
        qaScore: parseFloat((data.totalScore / data.count).toFixed(2)),
        achievement: (data.totalScore / data.count) >= 97 ? 'Achieved' : 'Not Achieved',
        totalNC: data.ncCount,
      }))
      .sort((a, b) => b.qaScore - a.qaScore);

    // Format Team Leader ranking
    const teamLeaderRanking = Array.from(teamLeaderMap.entries())
      .map(([name, data]) => ({
        teamLeader: name,
        sampling: data.count,
        qaScore: parseFloat((data.totalScore / data.count).toFixed(2)),
        achievement: (data.totalScore / data.count) >= 97 ? 'Achieved' : 'Not Achieved',
      }))
      .sort((a, b) => b.qaScore - a.qaScore);

    // Format parameter achievement per month
    const parameterAchievement = Array.from(paramMonthlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, data]) => ({
        month: monthNames[m - 1],
        monthNum: m,
        validitas: parseFloat(((data.validitas / data.count / 30) * 100).toFixed(2)),
        serviceLevel: parseFloat(((data.serviceLevel / data.count / 30) * 100).toFixed(2)),
        kalimat: parseFloat(((data.kalimat / data.count / 10) * 100).toFixed(2)),
        responTime: parseFloat(((data.responTime / data.count / 15) * 100).toFixed(2)),
        dokumentasi: parseFloat(((data.dokumentasi / data.count / 15) * 100).toFixed(2)),
      }));

    // Format Top 5 NC KIP Level 3
    const topKipNc = Array.from(kip3NcMap.entries())
      .map(([kip, count]) => ({ kip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      monthlyScores,
      agentRanking,
      teamLeaderRanking,
      parameterAchievement,
      topKipNc,
      ncDetails: ncDetails.slice(0, 500),
      nonNcDetails: nonNcDetails.slice(0, 500),
      totalSampling: allData.length,
    };
  }

  async getDetailTapping(
    page = 1, limit = 100, year?: string, month?: string,
    agent?: string, peak?: string, search?: string, filters?: string,
    sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc', user?: any, teamLeader?: string,
  ) {
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    const andConditions: any[] = [];
    if (year) {
      const y = parseInt(year);
      const startDate = new Date(y, month ? parseInt(month) - 1 : 0, 1);
      const endDate = month
        ? new Date(y, parseInt(month), 1)
        : new Date(y + 1, 0, 1);
      whereClause.createdAt = { gte: startDate, lt: endDate };
    }

    if (agent) {
      whereClause.agent = agent;
    }

    if (teamLeader) {
      whereClause.teamLeader = teamLeader;
    }

    if (peak) {
      whereClause.peak = parseInt(peak);
    }

    if (search) {
      andConditions.push({
        OR: [
          { idTiket: { contains: search, mode: 'insensitive' } },
          { agent: { contains: search, mode: 'insensitive' } },
          { tapper: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        Object.keys(parsedFilters).forEach(key => {
          const val = parsedFilters[key];
          if (val && Array.isArray(val) && val.length > 0) {
            andConditions.push({ [key]: { in: val } });
          } else if (val) {
            andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
          }
        });
      } catch (e) {}
    }

    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
    }

    // Get paginated data
    const [data, total] = await Promise.all([
      this.prisma.qaFormTapping.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      this.prisma.qaFormTapping.count({ where: whereClause }),
    ]);

    // Get aggregate stats (for all matching records, not just current page)
    const allForStats = await this.prisma.qaFormTapping.findMany({
      where: whereClause,
      select: {
        scoreValiditas: true,
        scoreServiceLevel: true,
        scoreKalimat: true,
        scoreResponTime: true,
        scoreDokumentasi: true,
        agent: true,
      },
    });
    
    // Fetch lookup agents to determine which are eksekutor
    const lookupAgents = await this.prisma.lookupAgent.findMany();
    const eksekutorAgents = new Set<string>();
    lookupAgents.forEach(a => {
      if (a.group && a.group.toLowerCase().includes('eksekutor') && a.namaAgent) {
        eksekutorAgents.add(a.namaAgent.toLowerCase().trim());
      }
    });

    let totalScoreSum = 0;
    let ncValiditas = 0;
    let ncServiceLevel = 0;
    let ncKalimat = 0;
    let ncResponTime = 0;
    let ncDokumentasi = 0;
    let totalNC = 0;
    let totalEksekutorTappings = 0;

    for (const row of allForStats) {
      if (row.agent && eksekutorAgents.has(row.agent.toLowerCase().trim())) {
        totalEksekutorTappings++;
      }
      
      const totalScore = row.scoreValiditas + row.scoreServiceLevel +
        row.scoreKalimat + row.scoreResponTime + row.scoreDokumentasi;
      totalScoreSum += totalScore;

      const isNC = row.scoreValiditas < 30 || row.scoreServiceLevel < 30 ||
        row.scoreKalimat < 10 || row.scoreResponTime < 15 || row.scoreDokumentasi < 15;
      if (isNC) totalNC++;

      if (row.scoreValiditas < 30) ncValiditas++;
      if (row.scoreServiceLevel < 30) ncServiceLevel++;
      if (row.scoreKalimat < 10) ncKalimat++;
      if (row.scoreResponTime < 15) ncResponTime++;
      if (row.scoreDokumentasi < 15) ncDokumentasi++;
    }

    const avgScore = allForStats.length > 0
      ? parseFloat((totalScoreSum / allForStats.length).toFixed(2))
      : 0;
      
    const eksekutorPercentage = allForStats.length > 0
      ? parseFloat(((totalEksekutorTappings / allForStats.length) * 100).toFixed(2))
      : 0;

    const censoredData = data.map((row: any) => {
      const isAgent = user?.name === row.agent;
      const isTl = user?.name === row.teamLeader;
      const isPending = row.komitmenStatus === 'PENDING';
      
      let finalKomitmen = row.komitmen;
      if (isPending && !isAgent && !isTl) {
        finalKomitmen = '[Menunggu Approval TL]';
      } else if (user?.role === 'USER' && !isAgent) {
        finalKomitmen = row.komitmen ? '[Komitmen Disembunyikan]' : null;
      }
      
      return {
        ...row,
        komitmen: finalKomitmen
      };
    });

    return {
      data: censoredData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalSampling: allForStats.length,
        qaScore: avgScore,
        totalNC,
        ncValiditas,
        ncServiceLevel,
        ncKalimat,
        ncResponTime,
        ncDokumentasi,
        eksekutorPercentage,
        totalEksekutorTappings,
      },
    };
  }

  async getDetailTappingFilterOptions(user?: any) {
    const whereClause: any = {};

    const [agents, years, peaks, teamLeaders] = await Promise.all([
      this.prisma.qaFormTapping.findMany({
        where: whereClause,
        distinct: ['agent'],
        select: { agent: true },
      }),
      this.prisma.$queryRawUnsafe(`
        SELECT DISTINCT EXTRACT(YEAR FROM "createdAt")::int as year
        FROM qa_form_tapping
        ORDER BY year DESC
      `),
      this.prisma.qaFormTapping.findMany({
        where: whereClause,
        distinct: ['peak'],
        select: { peak: true },
        orderBy: { peak: 'asc' },
      }),
      this.prisma.qaFormTapping.findMany({
        where: whereClause,
        distinct: ['teamLeader'],
        select: { teamLeader: true },
      }),
    ]);

    return {
      agents: agents.map(a => a.agent).filter(Boolean),
      years: (years as any[]).map(y => y.year),
      peaks: peaks.map(p => p.peak),
      teamLeaders: teamLeaders.map(t => t.teamLeader).filter(Boolean),
    };
  }

  async syncTicketsFromOca(startDate: string, endDate: string) {
    try {
      if (!startDate || !endDate) {
        throw new BadRequestException('startDate and endDate are required');
      }

      // Parse dates to include full day range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Fetch RawOca tickets within the date range
      const rawOcaTickets = await this.prisma.rawOca.findMany({
        where: {
          ticketCreated: {
            gte: start,
            lte: end,
          }
        }
      });

      if (rawOcaTickets.length === 0) {
        return { message: 'No tickets found in OCA for the selected date range', count: 0 };
      }

      // Fetch LookupAgent maps
      const agents = await this.prisma.lookupAgent.findMany();
      const agentMap = new Map<string, { teamLeader: string, tapper: string }>();
      for (const agent of agents) {
        if (agent.namaAgent) {
          agentMap.set(agent.namaAgent.toLowerCase().trim(), {
            teamLeader: agent.teamLeader || '',
            tapper: agent.tapper || '',
          });
        }
      }

      // Process and filter duplicates
      const uniqueIds = rawOcaTickets.map(t => t.ticketNumber);
      
      const existingPending: any[] = [];
      const existingTapped: any[] = [];
      
      // Chunk the uniqueIds to avoid Postgres parameter limit (32767)
      const CHUNK_SIZE = 10000;
      for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
        
        const pendingChunk = await this.prisma.qaTicket.findMany({
          where: { idTiket: { in: chunk } },
          select: { id: true, idTiket: true, handlingTime: true }
        });
        existingPending.push(...pendingChunk);

        const tappedChunk = await this.prisma.qaFormTapping.findMany({
          where: { idTiket: { in: chunk } },
          select: { idTiket: true }
        });
        existingTapped.push(...tappedChunk);
      }

      const existingPendingIds = new Set(existingPending.map(t => t.idTiket));
      const existingTappedIds = new Set(existingTapped.map(t => t.idTiket));

      const newTicketsToInsert: any[] = [];
      const ticketsToUpdate: any[] = []; // For updating missing handlingTime
      
      for (const raw of rawOcaTickets) {
        let bestHandlingTime = raw.ticketDuration || '';
        
        if (!bestHandlingTime || bestHandlingTime === '-' || bestHandlingTime.trim() === '') {
          if (raw.totalResolutionTime && String(raw.totalResolutionTime).includes(':') && !String(raw.totalResolutionTime).includes('T')) {
            bestHandlingTime = raw.totalResolutionTime;
          } else if (raw.resolveTime && raw.ticketCreated) {
            const diffMs = new Date(raw.resolveTime).getTime() - new Date(raw.ticketCreated).getTime();
            if (diffMs >= 0) {
              const diffSec = Math.floor(diffMs / 1000);
              const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
              const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
              const s = String(diffSec % 60).padStart(2, '0');
              bestHandlingTime = `${h}:${m}:${s}`;
            }
          }
        }
        
        if (bestHandlingTime === '-') bestHandlingTime = '';
        
        if (existingTappedIds.has(raw.ticketNumber)) {
          continue; // Skip if already tapped
        }

        if (existingPendingIds.has(raw.ticketNumber)) {
          // If it exists but we can check if we want to update it
          // We'll just run a bulk update for existing pending tickets that have no handling time
          const existingTicket = existingPending.find(t => t.idTiket === raw.ticketNumber);
          if (existingTicket && (!existingTicket.handlingTime || existingTicket.handlingTime === '' || existingTicket.handlingTime === '-')) {
            if (bestHandlingTime && bestHandlingTime !== '-') {
              ticketsToUpdate.push({
                id: existingTicket.id,
                handlingTime: bestHandlingTime
              });
            }
          }
          continue;
        }

        // In OCA, resolvedBy is sometimes literally "agent". We should use assignee in that case.
        const resolvedBy = raw.resolvedBy === 'agent' ? null : raw.resolvedBy;
        const agentName = resolvedBy || raw.assignee || raw.reporter || '';
        const agentInfo = agentMap.get(agentName.toLowerCase().trim()) || { teamLeader: '', tapper: '' };

        const inOutSlaStr = raw.inSla === true ? 'IN SLA' : (raw.inSla === false ? 'OUT SLA' : 'NO SLA');

        newTicketsToInsert.push({
          idTiket: raw.ticketNumber,
          agent: agentName,
          tapper: agentInfo.tapper,
          teamLeader: agentInfo.teamLeader,
          channel: raw.channel || '',
          jenisInteraksi: raw.category || '',
          kipLevel2: raw.subCategory || '',
          kipLevel3: raw.detailCategory || '',
          inOutSla: inOutSlaStr,
          projectId: raw.projectId || '',
          perusahaan: raw.namaPerusahaan || '',
          customerRequests: raw.ticketSubject || raw.description || '',
          agentResponse: raw.converse || '',
          handlingTime: bestHandlingTime,
          msisdn: raw.jumlahMsisdn || '',
          createdTicket: raw.ticketCreated,
        });
      }

      let updatedCount = 0;
      if (ticketsToUpdate.length > 0) {
        for (const t of ticketsToUpdate) {
          await this.prisma.qaTicket.update({
            where: { id: t.id },
            data: { handlingTime: t.handlingTime }
          });
          updatedCount++;
        }
      }

      if (newTicketsToInsert.length === 0) {
        let msg = `Synced 0 new tickets (All ${rawOcaTickets.length} tickets already exist in QA system)`;
        if (updatedCount > 0) msg += `. Updated ${updatedCount} existing tickets with AHT.`;
        return { 
          message: msg, 
          count: 0 
        };
      }

      const BATCH_SIZE = 1000;
      for (let i = 0; i < newTicketsToInsert.length; i += BATCH_SIZE) {
        const batch = newTicketsToInsert.slice(i, i + BATCH_SIZE);
        await this.prisma.qaTicket.createMany({ data: batch });
      }

      let successMsg = `Successfully synced ${newTicketsToInsert.length} new tickets from OCA!`;
      if (updatedCount > 0) successMsg += ` Updated ${updatedCount} existing tickets.`;

      return {
        message: successMsg,
        count: newTicketsToInsert.length
      };
    } catch (e: any) {
      console.error('CRITICAL ERROR IN syncTicketsFromOca:', e);
      throw new HttpException({ 
        success: false, 
        message: 'Error from syncTicketsFromOca',
        detail: e.message || e.toString(),
        stack: e.stack
      }, 500);
    }
  }
  async updateKomitmen(id: string, komitmen: string, user: any) {
    const record = await this.prisma.qaFormTapping.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Data tidak ditemukan');

    // Only the agent themselves can update their komitmen
    // Wait, let's allow ADMIN, TL, QC as well in case they need to fix it?
    if (user.role === 'USER' && record.agent !== user.name) {
      throw new UnauthorizedException('Anda tidak berhak mengisi komitmen untuk data ini');
    }

    return this.prisma.qaFormTapping.update({
      where: { id },
      data: { komitmen, komitmenStatus: 'PENDING' },
    });
  }

  async approveKomitmen(id: string, user: any) {
    const record = await this.prisma.qaFormTapping.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Data tidak ditemukan');

    if (user.role === 'TL' && record.teamLeader !== user.name) {
      throw new UnauthorizedException('Anda tidak berhak melakukan persetujuan untuk agen ini');
    }

    return this.prisma.qaFormTapping.update({
      where: { id },
      data: { komitmenStatus: 'APPROVED' },
    });
  }

  async rejectKomitmen(id: string, user: any) {
    const record = await this.prisma.qaFormTapping.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Data tidak ditemukan');

    if (user.role === 'TL' && record.teamLeader !== user.name) {
      throw new UnauthorizedException('Anda tidak berhak melakukan penolakan untuk agen ini');
    }

    return this.prisma.qaFormTapping.update({
      where: { id },
      data: { komitmenStatus: 'REJECTED' },
    });
  }
}
