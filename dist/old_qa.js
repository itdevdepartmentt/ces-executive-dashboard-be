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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma/prisma.service");
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
let QaService = class QaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createFormTapping(data) {
        const { qaTicketId, ...formTappingData } = data;
        const formTapping = await this.prisma.qaFormTapping.create({
            data: formTappingData,
        });
        if (qaTicketId) {
            await this.prisma.qaTicket.delete({
                where: { id: qaTicketId },
            }).catch(() => {
            });
        }
        return formTapping;
    }
    async getPendingTickets(page, limit, year, month, agent, peak, search, filters, sortBy, sortOrder, user) {
        try {
            const parsedPage = isNaN(page) || page < 1 ? 1 : page;
            const parsedLimit = isNaN(limit) || limit < 1 ? 100 : limit;
            const skip = (parsedPage - 1) * parsedLimit;
            const andConditions = [];
            if (year && month) {
                const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
                andConditions.push({
                    createdTicket: {
                        gte: startDate,
                        lte: endDate,
                    }
                });
            }
            if (user) {
                if (user.role === 'TL_QC' || user.role === 'QC') {
                    andConditions.push({
                        tapper: {
                            equals: user.name,
                            mode: 'insensitive'
                        }
                    });
                }
            }
            if (agent) {
                andConditions.push({
                    agent: {
                        equals: agent,
                        mode: 'insensitive',
                    }
                });
            }
            if (peak === 'PEAK') {
                andConditions.push({ handlingTime: { gt: '00:05:00' } });
            }
            else if (peak === 'NON-PEAK') {
                andConditions.push({ handlingTime: { lte: '00:05:00' } });
            }
            if (search) {
                andConditions.push({
                    OR: [
                        { idTiket: { contains: search, mode: 'insensitive' } },
                        { agent: { contains: search, mode: 'insensitive' } }
                    ]
                });
            }
            if (filters) {
                try {
                    const parsedFilters = JSON.parse(filters);
                    Object.keys(parsedFilters).forEach(key => {
                        const val = parsedFilters[key];
                        if (val && Array.isArray(val) && val.length > 0) {
                            andConditions.push({ [key]: { in: val } });
                        }
                        else if (val) {
                            andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
                        }
                    });
                }
                catch (e) { }
            }
            const where = andConditions.length > 0 ? { AND: andConditions } : {};
            let orderBy = { createdTicket: 'desc' };
            if (sortBy) {
                orderBy = { [sortBy]: sortOrder || 'asc' };
            }
            const [total, data] = await Promise.all([
                this.prisma.qaTicket.count({ where }),
                this.prisma.qaTicket.findMany({
                    where,
                    skip,
                    take: parsedLimit,
                    orderBy,
                }),
            ]);
            return {
                data,
                total,
                page: parsedPage,
                limit: parsedLimit,
                totalPages: Math.ceil(total / parsedLimit),
            };
        }
        catch (e) {
            console.error('CRITICAL ERROR IN getPendingTickets:', e);
            throw new common_1.HttpException({
                success: false,
                message: 'Error from getPendingTickets',
                detail: e.message || e.toString(),
                stack: e.stack
            }, 500);
        }
    }
    async getAllFormTapping(page = 1, limit = 10, search, filters, user, sortBy, sortOrder = 'desc') {
        const skip = (page - 1) * limit;
        const andConditions = [];
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
                    }
                    else if (val) {
                        andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
                    }
                });
            }
            catch (e) { }
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
    async exportHistoryTappingTemplate() {
        const headers = [
            'idTiket', 'tapper', 'agent', 'teamLeader', 'channel', 'jenisInteraksi',
            'kipLevel2', 'kipLevel3', 'inOutSla', 'projectId', 'perusahaan',
            'customerRequests', 'agentResponse', 'handlingTime', 'scoreValiditas',
            'scoreServiceLevel', 'scoreKalimat', 'scoreResponTime', 'scoreDokumentasi',
            'status', 'solusi', 'notes', 'parameterPenilaian', 'subParameterPenilaian', 'peak'
        ];
        return headers.join(',') + '\n';
    }
    async uploadHistoryTapping(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        const results = [];
        return new Promise((resolve, reject) => {
            stream_1.Readable.from(file.buffer)
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => {
                const normalizedData = {};
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
                        }
                        else {
                            await this.prisma.qaFormTapping.create({
                                data: item
                            });
                            newCount++;
                        }
                        await this.prisma.qaTicket.deleteMany({
                            where: { idTiket: item.idTiket }
                        });
                    }
                    resolve({
                        message: `Successfully processed ${finalBatch.length} History Tapping records! (${newCount} inserted, ${updateCount} updated)`,
                        count: finalBatch.length,
                    });
                }
                catch (error) {
                    console.error('History Upload Error:', error);
                    reject(new common_1.BadRequestException('Failed to process history tapping'));
                }
            })
                .on('error', (error) => {
                reject(new common_1.BadRequestException('Error parsing CSV file'));
            });
        });
    }
    async getHistoryFilterOptions(user) {
        const whereClause = {};
        if (user?.role === 'USER') {
            whereClause.agent = user.name;
        }
        else if (user?.role === 'QC') {
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
    async exportAllFormTapping(search, filters, user, sortBy, sortOrder = 'desc') {
        const andConditions = [];
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
                    }
                    else if (val) {
                        andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
                    }
                });
            }
            catch (e) { }
        }
        const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};
        return this.prisma.qaFormTapping.findMany({
            where: whereClause,
            orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        });
    }
    async getFormTappingById(id) {
        const form = await this.prisma.qaFormTapping.findUnique({
            where: { id },
        });
        if (!form) {
            throw new common_1.NotFoundException('QA Form Tapping not found');
        }
        return form;
    }
    async updateFormTapping(id, data) {
        const form = await this.prisma.qaFormTapping.findUnique({ where: { id } });
        if (!form)
            throw new common_1.NotFoundException('QA Form Tapping not found');
        return this.prisma.qaFormTapping.update({
            where: { id },
            data,
        });
    }
    async deleteFormTapping(id) {
        const form = await this.prisma.qaFormTapping.findUnique({ where: { id } });
        if (!form)
            throw new common_1.NotFoundException('QA Form Tapping not found');
        return this.prisma.qaFormTapping.delete({
            where: { id },
        });
    }
    async getTicketFilterOptions(user) {
        let whereClause = {};
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
    async exportPendingTickets(search, filters, user, sortBy, sortOrder = 'desc') {
        const andConditions = [];
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
                    }
                    else if (val) {
                        andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
                    }
                });
            }
            catch (e) { }
        }
        const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};
        return this.prisma.qaTicket.findMany({
            where: whereClause,
            orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        });
    }
    async getPendingTicketById(id) {
        const ticket = await this.prisma.qaTicket.findUnique({
            where: { id },
        });
        if (!ticket) {
            throw new common_1.NotFoundException(`Pending QA Ticket with ID ${id} not found`);
        }
        return ticket;
    }
    async deletePendingTicket(id) {
        return this.prisma.qaTicket.delete({
            where: { id },
        });
    }
    async uploadTickets(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const results = [];
        const stream = stream_1.Readable.from(file.buffer);
        const csvString = file.buffer.toString('utf-8');
        const separator = csvString.includes(';') && !csvString.includes(',') ? ';' : ',';
        return new Promise((resolve, reject) => {
            stream
                .pipe((0, csv_parser_1.default)({ separator }))
                .on('data', (data) => {
                const normalizedData = {};
                for (const key in data) {
                    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                    normalizedData[normKey] = data[key];
                }
                const isMasterAgent = ('namaagent' in normalizedData || 'agentname' in normalizedData) &&
                    ('teamleader' in normalizedData || 'namatl' in normalizedData || 'tapper' in normalizedData) &&
                    !('ticketnumber' in normalizedData) && !('idtiket' in normalizedData);
                if (isMasterAgent) {
                    results.push({
                        namaAgent: normalizedData.namaagent || normalizedData.agentname || '',
                        teamLeader: normalizedData.teamleader || normalizedData.namatl || normalizedData.tl || '',
                        tapper: normalizedData.tapper || normalizedData.namatapper || '',
                    });
                    results.isMasterData = true;
                }
                else {
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
                        msisdn: normalizedData.msisdn || normalizedData.jumlahmsisdn || '',
                        createdTicket: normalizedData.ticketcreated ? new Date(normalizedData.ticketcreated) : null,
                    });
                }
            })
                .on('end', async () => {
                try {
                    if (results.isMasterData) {
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
                            }
                            else {
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
                    const uniqueResultsMap = new Map();
                    results.forEach(item => {
                        if (item.idTiket) {
                            uniqueResultsMap.set(item.idTiket, item);
                        }
                    });
                    const uniqueResults = Array.from(uniqueResultsMap.values());
                    const incomingIds = uniqueResults.map(t => t.idTiket);
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
                    const finalBatch = uniqueResults.filter(t => !existingPendingIds.has(t.idTiket) && !existingTappedIds.has(t.idTiket));
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
                }
                catch (error) {
                    console.error('Upload Error:', error);
                    reject(new common_1.BadRequestException('Failed to insert tickets into database'));
                }
            })
                .on('error', (error) => {
                reject(new common_1.BadRequestException('Error parsing CSV file'));
            });
        });
    }
    async getQaScoreDashboard(year, month, agent, peak, user) {
        const whereClause = {};
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
        const monthlyMap = new Map();
        const agentMap = new Map();
        const teamLeaderMap = new Map();
        const paramMonthlyMap = new Map();
        const ncDetails = [];
        const nonNcDetails = [];
        for (const row of allData) {
            const monthNum = new Date(row.createdAt).getMonth() + 1;
            const totalScore = row.scoreValiditas + row.scoreServiceLevel +
                row.scoreKalimat + row.scoreResponTime + row.scoreDokumentasi;
            const existing = monthlyMap.get(monthNum) || { totalScore: 0, count: 0 };
            existing.totalScore += totalScore;
            existing.count += 1;
            monthlyMap.set(monthNum, existing);
            const agentExisting = agentMap.get(row.agent) || { totalScore: 0, count: 0, ncCount: 0 };
            agentExisting.totalScore += totalScore;
            agentExisting.count += 1;
            const tl = row.teamLeader || 'Unknown';
            const tlExisting = teamLeaderMap.get(tl) || { totalScore: 0, count: 0, ncCount: 0 };
            tlExisting.totalScore += totalScore;
            tlExisting.count += 1;
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
            const isNC = row.scoreValiditas < 30 || row.scoreServiceLevel < 30 ||
                row.scoreKalimat < 10 || row.scoreResponTime < 15 || row.scoreDokumentasi < 15;
            if (isNC) {
                agentExisting.ncCount += 1;
                tlExisting.ncCount += 1;
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
            else {
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
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyScores = Array.from(monthlyMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([m, data]) => ({
            month: monthNames[m - 1],
            monthNum: m,
            avgScore: parseFloat((data.totalScore / data.count).toFixed(2)),
            count: data.count,
        }));
        const agentRanking = Array.from(agentMap.entries())
            .map(([name, data]) => ({
            agent: name,
            sampling: data.count,
            qaScore: parseFloat((data.totalScore / data.count).toFixed(2)),
            achievement: (data.totalScore / data.count) >= 97 ? 'Achieved' : 'Not Achieved',
            totalNC: data.ncCount,
        }))
            .sort((a, b) => b.qaScore - a.qaScore);
        const teamLeaderRanking = Array.from(teamLeaderMap.entries())
            .map(([name, data]) => ({
            teamLeader: name,
            sampling: data.count,
            qaScore: parseFloat((data.totalScore / data.count).toFixed(2)),
            achievement: (data.totalScore / data.count) >= 97 ? 'Achieved' : 'Not Achieved',
        }))
            .sort((a, b) => b.qaScore - a.qaScore);
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
            ncDetails: ncDetails.slice(0, 500),
            nonNcDetails: nonNcDetails.slice(0, 500),
            totalSampling: allData.length,
        };
    }
    async getDetailTapping(page = 1, limit = 100, year, month, agent, peak, search, filters, sortBy, sortOrder = 'desc', user) {
        const skip = (page - 1) * limit;
        const whereClause = {};
        const andConditions = [];
        if (user?.role === 'USER') {
            whereClause.agent = user.name;
        }
        else if (user?.role === 'QC') {
            whereClause.tapper = user.name;
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
                    }
                    else if (val) {
                        andConditions.push({ [key]: { contains: val, mode: 'insensitive' } });
                    }
                });
            }
            catch (e) { }
        }
        if (andConditions.length > 0) {
            whereClause.AND = andConditions;
        }
        const [data, total] = await Promise.all([
            this.prisma.qaFormTapping.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
            }),
            this.prisma.qaFormTapping.count({ where: whereClause }),
        ]);
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
        const lookupAgents = await this.prisma.lookupAgent.findMany();
        const eksekutorAgents = new Set();
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
            if (isNC)
                totalNC++;
            if (row.scoreValiditas < 30)
                ncValiditas++;
            if (row.scoreServiceLevel < 30)
                ncServiceLevel++;
            if (row.scoreKalimat < 10)
                ncKalimat++;
            if (row.scoreResponTime < 15)
                ncResponTime++;
            if (row.scoreDokumentasi < 15)
                ncDokumentasi++;
        }
        const avgScore = allForStats.length > 0
            ? parseFloat((totalScoreSum / allForStats.length).toFixed(2))
            : 0;
        const eksekutorPercentage = allForStats.length > 0
            ? parseFloat(((totalEksekutorTappings / allForStats.length) * 100).toFixed(2))
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
                eksekutorPercentage,
                totalEksekutorTappings,
            },
        };
    }
    async getDetailTappingFilterOptions(user) {
        const whereClause = {};
        if (user?.role === 'QC') {
            whereClause.tapper = user.name;
        }
        else if (user?.role === 'USER') {
            whereClause.agent = user.name;
        }
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
            years: years.map(y => y.year),
            peaks: peaks.map(p => p.peak),
        };
    }
    async syncTicketsFromOca(startDate, endDate) {
        try {
            if (!startDate || !endDate) {
                throw new common_1.BadRequestException('startDate and endDate are required');
            }
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
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
            const agents = await this.prisma.lookupAgent.findMany();
            const agentMap = new Map();
            for (const agent of agents) {
                if (agent.namaAgent) {
                    agentMap.set(agent.namaAgent.toLowerCase().trim(), {
                        teamLeader: agent.teamLeader || '',
                        tapper: agent.tapper || '',
                    });
                }
            }
            const uniqueIds = rawOcaTickets.map(t => t.ticketNumber);
            const existingPending = [];
            const existingTapped = [];
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
            const newTicketsToInsert = [];
            const ticketsToUpdate = [];
            for (const raw of rawOcaTickets) {
                let bestHandlingTime = raw.ticketDuration || '';
                if (!bestHandlingTime || bestHandlingTime === '-' || bestHandlingTime.trim() === '') {
                    if (raw.totalResolutionTime && String(raw.totalResolutionTime).includes(':') && !String(raw.totalResolutionTime).includes('T')) {
                        bestHandlingTime = raw.totalResolutionTime;
                    }
                    else if (raw.resolveTime && raw.ticketCreated) {
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
                if (bestHandlingTime === '-')
                    bestHandlingTime = '';
                if (existingTappedIds.has(raw.ticketNumber)) {
                    continue;
                }
                if (existingPendingIds.has(raw.ticketNumber)) {
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
                if (updatedCount > 0)
                    msg += `. Updated ${updatedCount} existing tickets with AHT.`;
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
            if (updatedCount > 0)
                successMsg += ` Updated ${updatedCount} existing tickets.`;
            return {
                message: successMsg,
                count: newTicketsToInsert.length
            };
        }
        catch (e) {
            console.error('CRITICAL ERROR IN syncTicketsFromOca:', e);
            throw new common_1.HttpException({
                success: false,
                message: 'Error from syncTicketsFromOca',
                detail: e.message || e.toString(),
                stack: e.stack
            }, 500);
        }
    }
    async updateKomitmen(id, komitmen, user) {
        const record = await this.prisma.qaFormTapping.findUnique({
            where: { id },
        });
        if (!record)
            throw new common_1.NotFoundException('Data tidak ditemukan');
        if (user.role === 'USER' && record.agent !== user.name) {
            throw new common_1.UnauthorizedException('Anda tidak berhak mengisi komitmen untuk data ini');
        }
        return this.prisma.qaFormTapping.update({
            where: { id },
            data: { komitmen },
        });
    }
};
exports.QaService = QaService;
exports.QaService = QaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QaService);
//# sourceMappingURL=old_qa.js.map