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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let OcaService = class OcaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getExecutiveSummary(filter) {
        const result = await this.prisma.$queryRaw `
      SELECT 
        COUNT(*)::int as "totalTickets",
        COUNT(*) FILTER (WHERE "last_status" = 'Open')::int as "totalOpen",
        COUNT(*) FILTER (WHERE "last_status" = 'Closed')::int as "totalClosed",
        COUNT(*) FILTER (WHERE "assignee" IS NOT NULL AND "assignee" != '')::int as "assigned",
        COUNT(*) FILTER (WHERE "assignee" IS NULL OR "assignee" = '')::int as "unassigned",
        
        -- SLA Calculation: (IN SLA / Valid Tickets) * 100
        CASE WHEN COUNT(*) FILTER (WHERE "statusTiket" = true) > 0 
             THEN ROUND(
                (COUNT(*) FILTER (WHERE "inSla")::decimal / 
                 COUNT(*) FILTER (WHERE "statusTiket" = true)::decimal) * 100, 2
             )
             ELSE 0 
        END as "slaPercentage"
      FROM "RawOca"
      WHERE "ticket_created" BETWEEN ${filter.startDate}::timestamp AND ${filter.endDate}::timestamp
    `;
        return result[0];
    }
    async getChannelStats(filter) {
        const isFcrColOca = filter.fcrType === 'realisasi' ? client_1.Prisma.sql `"isFcrRealisasi"` : client_1.Prisma.sql `"isFcr"`;
        const stats = await this.prisma.$queryRaw `
    WITH "UnifiedData" AS (
      -- 1. DATA FROM OCA (Your existing structure)
      SELECT 
        "channel", "statusTiket", "inSla", "last_status", "product", 
        "resolve_time", "ticket_created", ${isFcrColOca} as "isFcr", "isPareto",
        'OCA' as "source_origin" -- Tagging the source just in case
      FROM "RawOca"
      WHERE "ticket_created" BETWEEN ${filter.startDate}::timestamp AND ${filter.endDate}::timestamp

      UNION ALL

      -- 2. DATA FROM OMNIX (Map your specific columns here)
      SELECT 
        "channel_name" as "channel",                              -- e.g. 'instagram' or 'whatsapp'
        "statusTiket",                          -- MAP: Omnix column -> Standard Name
        "inSla",                                    -- MAP: Omnix column -> Standard Name
        "ticket_status_name" as "last_status",              -- MAP: Omnix column -> Standard Name
        "product",                                 -- MAP: Hardcode if Omnix doesn't have product types
        "date_close" as "resolve_time",             -- MAP: Omnix timestamp -> Standard Name
        "date_start_interaction" as "ticket_created",       -- MAP: Omnix timestamp -> Standard Name
        ${isFcrColOca} as "isFcr",                                    -- MAP: Omnix column -> Standard Name
        "isPareto",                                    -- MAP: Default to false if Omnix lacks this
        'OMNIX' as "source_origin"
      FROM "RawOmnix"
      WHERE "date_start_interaction" BETWEEN ${filter.startDate}::timestamp AND ${filter.endDate}::timestamp
    )

    -- 3. THE AGGREGATION (Runs on the combined result above)
    SELECT
        channel,
        source_origin, -- Grab this so we know which table to query for details later
        COUNT(*)::int as "total",
        
        -- % SLA (Logic reused exactly as is!)
        CASE WHEN COUNT(*) FILTER (WHERE "statusTiket" = true) > 0 
             THEN ROUND((COUNT(*) FILTER (WHERE "inSla")::decimal / NULLIF(COUNT(*) FILTER (WHERE "statusTiket" = true),0)) * 100, 2)
             ELSE 100 END as "pctSla",

        -- Basic Counts
        COUNT(*) FILTER (WHERE "last_status" = 'Open')::int as "open",
        COUNT(*) FILTER (WHERE "last_status" = 'Closed')::int as "closed",

        -- Product Specifics
        COUNT(*) FILTER (WHERE "last_status" = 'Open' AND UPPER("product") = 'CONNECTIVITY')::int as "connOpen",
        COUNT(*) FILTER (WHERE "last_status" = 'Open' AND UPPER("product") = 'SOLUTION')::int as "solOpen",
        
        -- Resolve Time Logic
        COUNT(*) FILTER (WHERE UPPER("product") = 'CONNECTIVITY' AND ("resolve_time" - "ticket_created") > interval '3 hours')::int as "connOver3h",
        COUNT(*) FILTER (WHERE UPPER("product") = 'SOLUTION' AND ("resolve_time" - "ticket_created") > interval '6 hours')::int as "solOver6h",

        -- FCR Stats
        COUNT(*) FILTER (WHERE NOT "isFcr")::int as "nonFcrCount",
        CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE "isFcr")::decimal / COUNT(*)) * 100, 2) ELSE 0 END as "pctFcr",
        CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE NOT "isFcr")::decimal / COUNT(*)) * 100, 2) ELSE 0 END as "pctNonFcr",

        -- Pareto Stats
        CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE "isPareto" = true)::decimal / COUNT(*)) * 100, 2) ELSE 0 END as "pctPareto",
        CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE "isPareto" = false)::decimal / COUNT(*)) * 100, 2) ELSE 0 END as "pctNotPareto"

    FROM "UnifiedData"
    GROUP BY "channel", "source_origin"
  `;
        const enhancedStats = await Promise.all(stats.map(async (stat) => {
            const topCorp = await this.getTopEntityForChannel(filter, stat.channel, 'nama_perusahaan', stat.source_origin);
            const topKip = await this.getTopEntityForChannel(filter, stat.channel, 'detail_category', stat.source_origin);
            return { ...stat, topCorporate: topCorp, topKip: topKip };
        }));
        return enhancedStats;
    }
    async getTopEntityForChannel(filter, channel, metricType, source) {
        let tableName = '';
        let metricColumn = '';
        let dateColumn = '';
        let channelColumn = '';
        if (source === 'OCA') {
            tableName = '"RawOca"';
            metricColumn = `"${metricType}"`;
            dateColumn = '"ticket_created"';
            channelColumn = '"channel"';
        }
        else {
            tableName = '"RawOmnix"';
            dateColumn = '"date_start_interaction"';
            channelColumn = '"channel_name"';
            if (metricType === 'nama_perusahaan') {
                metricColumn = '"ticket_perusahaan"';
            }
            else {
                metricColumn = '"subCategory"';
            }
        }
        const result = await this.prisma.$queryRawUnsafe(`
        SELECT ${metricColumn} as name, COUNT(*)::int as total
        FROM ${tableName}
        WHERE ${channelColumn} = $1 
          AND ${dateColumn} BETWEEN $2::timestamp AND $3::timestamp
        GROUP BY ${metricColumn}
        ORDER BY total DESC
        LIMIT 5
      `, channel, filter.startDate, filter.endDate);
        return result || [];
    }
    async getEscalationSummary(query) {
        const { page, limit, search, startDate, endDate } = query;
        const skip = ((page ? page : 1) - 1) * (limit ? limit : 10);
        const summary = await this.prisma.$queryRaw `
      SELECT 
        "eskalasi" as type,
        COUNT(*) FILTER (WHERE "last_status" = 'Open')::int as "totalOpen",
        COUNT(*) FILTER (WHERE ("resolve_time" - "ticket_created") > interval '3 hours')::int as "over3h"
      FROM "RawOca"
      WHERE "eskalasi" IS NOT NULL AND "eskalasi" != ''
        AND "ticket_created" BETWEEN ${startDate}::timestamp AND ${endDate}::timestamp
      GROUP BY "eskalasi"
    `;
        const whereClause = {
            eskalasi: { not: '' },
            ticketCreated: { gte: new Date(startDate ? startDate : new Date()), lte: new Date(endDate ? endDate : new Date()) },
            OR: search ? [
                { ticketNumber: { contains: search, mode: 'insensitive' } },
                { idRemedyNo: { contains: search, mode: 'insensitive' } }
            ] : undefined
        };
        const [total, data] = await Promise.all([
            this.prisma.rawOca.count({ where: whereClause }),
            this.prisma.rawOca.findMany({
                where: whereClause,
                select: {
                    ticketCreated: true,
                    ticketNumber: true,
                    idRemedyNo: true,
                    ticketDuration: true,
                    assignee: true,
                    department: true,
                    eskalasi: true
                },
                skip,
                take: limit,
                orderBy: { ticketCreated: 'desc' }
            })
        ]);
        return {
            summary,
            list: { data, total, page, limit }
        };
    }
    async getSpecialAccountStats(filter, type) {
        const isVip = type === 'VIP';
        const condition = isVip
            ? `WHERE "isVip" = true`
            : `WHERE "isPareto" = true AND "isVip" = false`;
        const rawQuery = `
        SELECT 
            COUNT(*) FILTER (WHERE "last_status" = 'Open')::int as "openTickets",
            COUNT(*) FILTER (WHERE ("resolve_time" - "ticket_created") > interval '3 hours')::int as "over3h"
        FROM "RawOca"
        ${condition}
        AND "ticket_created" BETWEEN $1::timestamp AND $2::timestamp
    `;
        const stats = await this.prisma.$queryRawUnsafe(rawQuery, filter.startDate, filter.endDate);
        const topCorps = await this.prisma.$queryRawUnsafe(`
        SELECT "nama_perusahaan", COUNT(*)::int as total
        FROM "RawOca"
        ${condition}
        AND "ticket_created" BETWEEN $1::timestamp AND $2::timestamp
        GROUP BY "nama_perusahaan"
        ORDER BY total DESC
        LIMIT 10
    `, filter.startDate, filter.endDate);
        return { stats: stats[0], topCorps };
    }
    async getTopKipPerCompany(query) {
        const { page, limit, search, startDate, endDate } = query;
        const offset = ((page ? page : 1) - 1) * (limit ? limit : 10);
        const companyQuery = `
        SELECT "nama_perusahaan", COUNT(*)::int as total_tickets
        FROM "RawOca"
        WHERE "ticket_created" BETWEEN $1::timestamp AND $2::timestamp
        ${search ? `AND "nama_perusahaan" ILIKE '%' || $3 || '%'` : ''}
        GROUP BY "nama_perusahaan"
        ORDER BY total_tickets DESC
        LIMIT ${limit ? limit : 10} OFFSET ${offset}
    `;
        const params = search ? [startDate, endDate, search] : [startDate, endDate];
        const companies = await this.prisma.$queryRawUnsafe(companyQuery, ...params);
        if (companies.length === 0)
            return { data: [], total: 0 };
        const companyNames = companies.map(c => c.nama_perusahaan);
        const kips = await this.prisma.$queryRaw `
        WITH RankedKip AS (
            SELECT 
                "nama_perusahaan", 
                "detail_category", 
                COUNT(*)::int as kip_count,
                ROW_NUMBER() OVER(PARTITION BY "nama_perusahaan" ORDER BY COUNT(*) DESC)::int as rn
            FROM "RawOca"
            WHERE "nama_perusahaan" IN (${client_1.Prisma.join(companyNames)})
              AND "ticket_created" BETWEEN ${startDate}::timestamp AND ${endDate}::timestamp
            GROUP BY "nama_perusahaan", "detail_category"
        )
        SELECT * FROM RankedKip WHERE rn <= 3
    `;
        const result = companies.map(comp => {
            return {
                company: comp.nama_perusahaan,
                totalTickets: comp.total_tickets,
                topKips: kips.filter(k => k.nama_perusahaan === comp.nama_perusahaan)
            };
        });
        return result;
    }
    async getProductBreakdown(filter) {
        const products = await this.prisma.$queryRaw `
        SELECT 
            "product",
            COUNT(*)::int as "total",
            COUNT(*) FILTER (WHERE "last_status" = 'Open')::int as "open",
            COUNT(*) FILTER (WHERE ("resolve_time" - "ticket_created") > interval '3 hours')::int as "over3h",
             CASE WHEN COUNT(*) FILTER (WHERE "statusTiket" = true) > 0 
                 THEN ROUND(
                    (COUNT(*) FILTER (WHERE "inSla")::decimal / 
                     COUNT(*) FILTER (WHERE "statusTiket" = true)::decimal) * 100, 2
                 )
                 ELSE 0 
            END as "pctSla"
        FROM "RawOca"
        WHERE "ticket_created" BETWEEN ${filter.startDate}::timestamp AND ${filter.endDate}::timestamp
        AND "product" IN ('CONNECTIVITY', 'SOLUTION', 'DADS')
        GROUP BY "product"
      `;
        const detailed = await Promise.all(products.map(async (p) => {
            const topKips = await this.prisma.$queryRaw `
            SELECT "detail_category", COUNT(*)::int as total,
            -- Recalculate SLA just for this KIP
            CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE "inSla")::decimal / COUNT(*)) * 100, 2) ELSE 0 END as "kipSla"
            FROM "RawOca"
            WHERE "product" = ${p.product}
              AND "ticket_created" BETWEEN ${filter.startDate}::timestamp AND ${filter.endDate}::timestamp
            GROUP BY "detail_category"
            ORDER BY total DESC
            LIMIT 10
          `;
            return { ...p, topKips };
        }));
        return detailed;
    }
};
exports.OcaService = OcaService;
exports.OcaService = OcaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OcaService);
//# sourceMappingURL=oca.service.js.map