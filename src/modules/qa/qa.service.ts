import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import csv from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class QaService {
  constructor(private readonly prisma: PrismaService) {}

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

    return formTapping;
  }

  async getAllFormTapping(page = 1, limit = 10, search?: string, filters?: string, user?: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const skip = (page - 1) * limit;
    
    const andConditions: any[] = [];
    
    if (user && user.role === 'QC') {
      andConditions.push({ tapper: user.name });
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
    let whereClause: any = {};
    if (user && user.role === 'QC') {
      whereClause.tapper = user.name;
    }

    const [tappers, agents, channels, kipLevel2s, kipLevel3s, jenisInteraksis, inOutSlas] = await Promise.all([
      this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['tapper'], select: { tapper: true } }),
      this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['agent'], select: { agent: true } }),
      this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['channel'], select: { channel: true } }),
      this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['kipLevel2'], select: { kipLevel2: true } }),
      this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['kipLevel3'], select: { kipLevel3: true } }),
      this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['jenisInteraksi'], select: { jenisInteraksi: true } }),
      this.prisma.qaFormTapping.findMany({ where: whereClause, distinct: ['inOutSla'], select: { inOutSla: true } }),
    ]);

    return {
      tapper: tappers.map(t => t.tapper).filter(Boolean),
      agent: agents.map(a => a.agent).filter(Boolean),
      channel: channels.map(c => c.channel).filter(Boolean),
      kipLevel2: kipLevel2s.map(k => k.kipLevel2).filter(Boolean),
      kipLevel3: kipLevel3s.map(k => k.kipLevel3).filter(Boolean),
      jenisInteraksi: jenisInteraksis.map(j => j.jenisInteraksi).filter(Boolean),
      inOutSla: inOutSlas.map(s => s.inOutSla).filter(Boolean),
    };
  }

  async exportAllFormTapping(search?: string, filters?: string, user?: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const andConditions: any[] = [];
    
    if (user && user.role === 'QC') {
      andConditions.push({ tapper: user.name });
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

  async getPendingTickets(page = 1, limit = 10, search?: string, filters?: string, user?: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const skip = (page - 1) * limit;

    const andConditions: any[] = [];

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
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketFilterOptions(user?: any) {
    let whereClause: any = {};

    const [tappers, agents, channels, kipLevel2s, kipLevel3s, jenisInteraksis, inOutSlas] = await Promise.all([
      this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['tapper'], select: { tapper: true } }),
      this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['agent'], select: { agent: true } }),
      this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['channel'], select: { channel: true } }),
      this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['kipLevel2'], select: { kipLevel2: true } }),
      this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['kipLevel3'], select: { kipLevel3: true } }),
      this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['jenisInteraksi'], select: { jenisInteraksi: true } }),
      this.prisma.qaTicket.findMany({ where: whereClause, distinct: ['inOutSla'], select: { inOutSla: true } }),
    ]);

    return {
      tapper: tappers.map(t => t.tapper).filter(Boolean),
      agent: agents.map(a => a.agent).filter(Boolean),
      channel: channels.map(c => c.channel).filter(Boolean),
      kipLevel2: kipLevel2s.map(k => k.kipLevel2).filter(Boolean),
      kipLevel3: kipLevel3s.map(k => k.kipLevel3).filter(Boolean),
      jenisInteraksi: jenisInteraksis.map(j => j.jenisInteraksi).filter(Boolean),
      inOutSla: inOutSlas.map(s => s.inOutSla).filter(Boolean),
    };
  }

  async exportPendingTickets(search?: string, filters?: string, user?: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const andConditions: any[] = [];

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
    const stream = Readable.from(file.buffer);

    const csvString = file.buffer.toString('utf-8');
    const separator = csvString.includes(';') && !csvString.includes(',') ? ';' : ',';
    
    return new Promise((resolve, reject) => {
      stream
        .pipe(csv({ separator }))
        .on('data', (data) => {
          // Normalize keys for robust matching
          const normalizedData: any = {};
          for (const key in data) {
             const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
             normalizedData[normKey] = data[key];
          }

          // Smart Auto-Detection
          const isMasterAgent = ('namaagent' in normalizedData || 'agentname' in normalizedData) && 
                                ('teamleader' in normalizedData || 'namatl' in normalizedData || 'tapper' in normalizedData) &&
                                !('ticketnumber' in normalizedData) && !('idtiket' in normalizedData);
          
          if (isMasterAgent) {
            results.push({
              namaAgent: normalizedData.namaagent || normalizedData.agentname || '',
              teamLeader: normalizedData.teamleader || normalizedData.namatl || normalizedData.tl || '',
              tapper: normalizedData.tapper || normalizedData.namatapper || '',
            });
            // Attach a flag to the array so we know it's master data
            (results as any).isMasterData = true;
          } else {
            results.push({
              idTiket: normalizedData.ticketnumber || normalizedData.idtiket || normalizedData.ticketid || '',
              agent: normalizedData.resolvedby || normalizedData.assignee || normalizedData.reporter || normalizedData.agent || normalizedData.agentname || '',
              tapper: normalizedData.tapper || normalizedData.qc || normalizedData.qa || '',
              teamLeader: normalizedData.teamleader || normalizedData.tl || normalizedData.spv || normalizedData.supervisor || '',
              channel: normalizedData.channel || '',
              jenisInteraksi: normalizedData.category || normalizedData.jenisinteraksi || normalizedData.interactiontype || '',
              kipLevel2: normalizedData.subcategory || normalizedData.kiplevel2 || '',
              kipLevel3: normalizedData.detailcategory || normalizedData.kiplevel3 || '',
              inOutSla: normalizedData.inoutsla || normalizedData.sla || '',
              projectId: normalizedData.projectid || normalizedData.project || '',
              perusahaan: normalizedData.namaperusahaan || normalizedData.customername || normalizedData.perusahaan || normalizedData.company || '',
              customerRequests: normalizedData.ticketsubject || normalizedData.customerrequests || normalizedData.request || '',
              agentResponse: normalizedData.description || normalizedData.agentresponse || normalizedData.response || '',
            });
          }
        })
        .on('end', async () => {
          try {
            if ((results as any).isMasterData) {
               // Process Master Agent Data
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
               resolve({ 
                 message: `Successfully updated ${validAgents.length} Agent Master Data records!`, 
                 count: validAgents.length,
                 type: 'master-agent'
               });
               return;
            }

            // Process Ticket Data (Existing logic)
            // Filter out empty ID tickets and get unique by idTiket
            const uniqueResultsMap = new Map();
            results.forEach(item => {
              if (item.idTiket) {
                uniqueResultsMap.set(item.idTiket, item);
              }
            });
            const uniqueResults = Array.from(uniqueResultsMap.values());
            const incomingIds = uniqueResults.map(t => t.idTiket);

            // Find existing pending tickets
            const existingPending = await this.prisma.qaTicket.findMany({
              where: { idTiket: { in: incomingIds } },
              select: { idTiket: true }
            });
            const existingPendingIds = new Set(existingPending.map(t => t.idTiket));

            // Find existing tapped/reviewed tickets
            const existingTapped = await this.prisma.qaFormTapping.findMany({
              where: { idTiket: { in: incomingIds } },
              select: { idTiket: true }
            });
            const existingTappedIds = new Set(existingTapped.map(t => t.idTiket));

            // Filter out tickets that already exist in either pending or tapped
            const finalBatch = uniqueResults.filter(t => 
              !existingPendingIds.has(t.idTiket) && !existingTappedIds.has(t.idTiket)
            );

            // Batch inserts to prevent Supabase/PgBouncer ECONNRESET on large payloads
            const BATCH_SIZE = 1000;
            for (let i = 0; i < finalBatch.length; i += BATCH_SIZE) {
              const batch = finalBatch.slice(i, i + BATCH_SIZE);
              await this.prisma.qaTicket.createMany({
                data: batch,
              });
            }
            resolve({ 
              message: `Successfully uploaded ${finalBatch.length} new tickets! (${uniqueResults.length - finalBatch.length} duplicates skipped)`, 
              count: finalBatch.length,
              type: 'ticket-data'
            });
          } catch (error) {
            console.error('Upload Error:', error);
            reject(new BadRequestException('Failed to insert tickets into database'));
          }
        })
        .on('error', (error) => {
          reject(new BadRequestException('Error parsing CSV file'));
        });
    });
  }
  
  // --- QA Score Dashboard & Detail Tapping ---
  async getQaScoreDashboard(year?: string, month?: string, agent?: string, peak?: string, user?: any) {
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
        createdDate: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month for monthly score chart
    const monthlyMap = new Map<number, { totalScore: number; count: number }>();
    const agentMap = new Map<string, { totalScore: number; count: number }>();
    const teamLeaderMap = new Map<string, { totalScore: number; count: number }>();
    const paramMonthlyMap = new Map<number, {
      validitas: number; serviceLevel: number; kalimat: number;
      responTime: number; dokumentasi: number; count: number;
    }>();

    // NC detail list (tickets where any parameter got less than max)
    const ncDetails: any[] = [];

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
      const agentExisting = agentMap.get(row.agent) || { totalScore: 0, count: 0 };
      agentExisting.totalScore += totalScore;
      agentExisting.count += 1;
      agentMap.set(row.agent, agentExisting);

      // Team Leader aggregation
      const tl = row.teamLeader || 'Unknown';
      const tlExisting = teamLeaderMap.get(tl) || { totalScore: 0, count: 0 };
      tlExisting.totalScore += totalScore;
      tlExisting.count += 1;
      teamLeaderMap.set(tl, tlExisting);

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
          komitmen: (user?.role === 'USER' && user?.name !== row.agent) 
            ? (row.komitmen ? '[Komitmen Disembunyikan]' : null) 
            : row.komitmen,
        });
      }
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

    return {
      monthlyScores,
      agentRanking,
      teamLeaderRanking,
      parameterAchievement,
      ncDetails: ncDetails.slice(0, 500), // Limit NC details
      totalSampling: allData.length,
    };
  }

  async getDetailTapping(
    page = 1, limit = 100, year?: string, month?: string,
    agent?: string, peak?: string, search?: string, filters?: string,
    sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc', user?: any,
  ) {
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    const andConditions: any[] = [];
    // Role-based filtering: Agents can only see their own detail tapping
    if (user?.role === 'USER') {
      whereClause.agent = user.name;
    }
    if (year) {
      const y = parseInt(year);
      const startDate = new Date(y, month ? parseInt(month) - 1 : 0, 1);
      const endDate = month
        ? new Date(y, parseInt(month), 1)
        : new Date(y + 1, 0, 1);
      whereClause.createdAt = { gte: startDate, lt: endDate };
    }

    if (agent && user?.role !== 'USER') {
      whereClause.agent = agent;
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
      },
    });

    let totalScoreSum = 0;
    let ncValiditas = 0;
    let ncServiceLevel = 0;
    let ncKalimat = 0;
    let ncResponTime = 0;
    let ncDokumentasi = 0;
    let totalNC = 0;

    for (const row of allForStats) {
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

    return {
      data,
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
      },
    };
  }

  async getDetailTappingFilterOptions(user?: any) {
    const whereClause: any = {};
    // No role-based filtering for QC in Detail Tapping filter options

    const [agents, years, peaks] = await Promise.all([
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
    ]);

    return {
      agents: agents.map(a => a.agent).filter(Boolean),
      years: (years as any[]).map(y => y.year),
      peaks: peaks.map(p => p.peak),
    };
  }

  async syncTicketsFromOca(startDate: string, endDate: string) {
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
    const existingPending = await this.prisma.qaTicket.findMany({
      where: { idTiket: { in: uniqueIds } },
      select: { id: true, idTiket: true, handlingTime: true }
    });
    const existingPendingIds = new Set(existingPending.map(t => t.idTiket));

    const existingTapped = await this.prisma.qaFormTapping.findMany({
      where: { idTiket: { in: uniqueIds } },
      select: { idTiket: true }
    });
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
      data: { komitmen },
    });
  }
}
