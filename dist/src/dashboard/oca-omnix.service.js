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
exports.OcaOmnixService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let OcaOmnixService = class OcaOmnixService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    buildCategoryFilterQuery(filter, type) {
        const buildInClause = (values) => {
            if (!values || values.length === 0)
                return '';
            const escaped = values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
            return `IN (${escaped})`;
        };
        let query = '';
        const catIn = buildInClause(filter.categories);
        const subCatIn = buildInClause(filter.subCategories);
        const detCatIn = buildInClause(filter.detailCategories);
        if (type === 'OCA') {
            if (catIn)
                query += ` AND "category" ${catIn}`;
            if (subCatIn)
                query += ` AND "sub_category" ${subCatIn}`;
            if (detCatIn)
                query += ` AND "detail_category" ${detCatIn}`;
        }
        else if (type === 'OMNIX') {
            if (catIn)
                query += ` AND "category" ${catIn}`;
            if (subCatIn)
                query += ` AND "subCategory" ${subCatIn}`;
            if (detCatIn)
                query += ` AND "detailSubCategory" ${detCatIn}`;
        }
        else if (type === 'CALL') {
            if (catIn)
                query += ` AND "service" ${catIn}`;
            if (subCatIn)
                query += ` AND "topic_reason_1" ${subCatIn}`;
            if (detCatIn)
                query += ` AND "topic_reason_2" ${detCatIn}`;
        }
        return query;
    }
    buildPrismaCategoryFilter(filter, type) {
        const where = {};
        if (filter.categories?.length) {
            if (type === 'OCA' || type === 'OMNIX')
                where.category = { in: filter.categories };
            else if (type === 'CALL')
                where.service = { in: filter.categories };
        }
        if (filter.subCategories?.length) {
            if (type === 'OCA')
                where.subCategory = { in: filter.subCategories };
            else if (type === 'OMNIX')
                where.subCategory = { in: filter.subCategories };
            else if (type === 'CALL')
                where.topicReason1 = { in: filter.subCategories };
        }
        if (filter.detailCategories?.length) {
            if (type === 'OCA')
                where.detailCategory = { in: filter.detailCategories };
            else if (type === 'OMNIX')
                where.detailSubCategory = { in: filter.detailCategories };
            else if (type === 'CALL')
                where.topicReason2 = { in: filter.detailCategories };
        }
        return where;
    }
    async getExecutiveSummary(filter) {
        const isFcrColOca = filter.fcrType === 'realisasi' ? '"isFcrRealisasi"' : '"isFcr"';
        const unifiedCte = `
        WITH "UnifiedTickets" AS (
            SELECT 
                "last_status", 
                "statusTiket", 
                "inSla",
                ${isFcrColOca} as "isFcr",
                "ticket_created" as "ticket_timestamp",
                "channel"
            FROM "RawOca"
            WHERE 1=1 ${this.buildCategoryFilterQuery(filter, 'OCA')}
            
            UNION ALL

            SELECT 
                "ticket_status_name" as "last_status", 
                "statusTiket", 
                "inSla",
                ${isFcrColOca} as "isFcr",
                "date_start_interaction" as "ticket_timestamp",
                "channel_name" as "channel"
            FROM "RawOmnix"
            WHERE 1=1 ${this.buildCategoryFilterQuery(filter, 'OMNIX')}
               
            UNION ALL
            SELECT
                'closed' as "last_status",
                "statusTiket",
                "inSla",
                ${isFcrColOca} as "isFcr",
                "update_stamp" as "ticket_timestamp",
                "unit_type" as "channel"
            FROM "RawCall"
            WHERE 1=1 ${this.buildCategoryFilterQuery(filter, 'CALL')}
        )
    `;
        const [summaryResult, dailyResult, hourlyResult] = await Promise.all([
            this.prisma.$queryRawUnsafe(`
            ${unifiedCte}
        SELECT 
            COUNT(*)::int AS "totalCreated",

            -- totalTickets: filtered by channel
            COUNT(*) FILTER (
                WHERE "statusTiket"
                AND "channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
            )::int AS "totalTickets",

            -- totalOpen: filtered by channel + status
            COUNT(*) FILTER (
                WHERE "statusTiket"
                AND "channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
                AND NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%')
            )::int AS "totalOpen",

            -- totalClosed: filtered by channel + status
            COUNT(*) FILTER (
                WHERE "statusTiket"
                AND "channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
                AND ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%')
            )::int AS "totalClosed",

            -- SLA percentage: filtered by channel
            CASE
                WHEN COUNT(*) FILTER (
                    WHERE "statusTiket"
                    AND "channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
                ) > 0 THEN
                    ROUND(
                        COUNT(*) FILTER (
                            WHERE "inSla"  AND "statusTiket"
                            AND "statusTiket"
                            AND "channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
                        )::numeric
                        / COUNT(*) FILTER (
                            WHERE "statusTiket"
                            AND "channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
                        )::numeric
                        * 100,
                        2
                    )
                ELSE 0
            END AS "slaPercentage"

        FROM "UnifiedTickets"
        WHERE "ticket_timestamp" >= $1::timestamptz
        AND "ticket_timestamp" <  $2::timestamptz
        AND ($3::boolean IS NULL OR "isFcr" = $3::boolean);
        `, filter.startDate, filter.endDate, filter.isFcr ?? null),
            this.prisma.$queryRawUnsafe(`
            ${unifiedCte}
            , DateSeries AS (
                SELECT generate_series(
                    ($1::date - INTERVAL '6 days')::date,
                    $1::date,
                    '1 day'::interval
                )::date AS date
            ),
            UnifiedFiltered AS (
                SELECT 
                    DATE("ticket_timestamp" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') AS ticket_date,
                    "statusTiket",
                    "channel",
                    "inSla"
                FROM "UnifiedTickets"
                WHERE "ticket_timestamp" >= ($1::date - INTERVAL '6 days') AT TIME ZONE 'Asia/Jakarta' AT TIME ZONE 'UTC'
                AND "ticket_timestamp" <  ($1::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Jakarta' AT TIME ZONE 'UTC'
                AND ($2::boolean IS NULL OR "isFcr" = $2::boolean)
            )
        SELECT 
            TO_CHAR(ds.date, 'YYYY-MM-DD') AS "date",
            COUNT(uf.ticket_date)::int AS "value",
            CASE 
                WHEN COUNT(uf.ticket_date) FILTER (
                    WHERE uf."statusTiket"
                    AND uf."channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
                ) > 0 THEN
                    ROUND(
                        COUNT(uf.ticket_date) FILTER (
                            WHERE uf."inSla"  AND uf."statusTiket"
                            AND uf."channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
                        )::numeric
                        / COUNT(uf.ticket_date) FILTER (
                            WHERE uf."statusTiket"
                            AND uf."channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
                        )::numeric
                        * 100,
                        2
                    )
                ELSE 0
            END AS "sla"
        FROM DateSeries ds
        LEFT JOIN UnifiedFiltered uf ON ds.date = uf.ticket_date
        GROUP BY ds.date
        ORDER BY ds.date ASC;
        `, filter.endDate, filter.isFcr ?? null),
            this.prisma.$queryRawUnsafe(`
            ${unifiedCte}
SELECT 
    TRIM(
        TO_CHAR(
            (EXTRACT(HOUR FROM (ticket_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta'))::int),
            '00'
        )
    ) || ':00' AS time_bucket,
    
    COUNT(*)::int AS created,
    
    COUNT(*) FILTER (WHERE ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%'))::int AS solved

FROM "UnifiedTickets"
WHERE ticket_timestamp >= ($1::date - INTERVAL '7 hours')  -- 00:00 WIB → UTC
  AND ticket_timestamp <  (($1::date + INTERVAL '1 day') - INTERVAL '7 hours') -- 00:00 next day WIB → UTC
  AND ($2::boolean IS NULL OR "isFcr" = $2::boolean)
GROUP BY 1
ORDER BY 1 ASC;
        `, filter.endDate, filter.isFcr ?? null),
        ]);
        const [csatScore] = await this.getCsatScore(filter);
        const priority = await this.getPriorityData(filter);
        return {
            ...summaryResult[0],
            dailyTrend: dailyResult,
            hourlyTrend: hourlyResult,
            csatScore,
            priority,
        };
    }
    async getPriorityData(filter) {
        const { startDate, endDate } = filter;
        const [priorityData] = await this.prisma.$queryRaw `
   SELECT
    count(*) filter(where "isVip")::int as vip,
    count(*) filter(where "ticket_subject" ILIKE '%URGENT%')::int as urgent,
    count(*) filter(where "isPareto")::int as pareto,
    count(*) filter(where "ticket_subject" ILIKE '%ROAMING%')::int as roaming,
    count(*) filter(where "ticket_subject" ILIKE '%EKSTRA KUOTA%')::int as extra,
    count(*) filter(where "ticket_subject" ILIKE '%CC%')::int as cc

    from "RawOca" 
    WHERE "ticket_created" >= ${startDate}::timestamptz 
      AND "ticket_created" < ${endDate}::timestamptz
      AND "statusTiket"
      AND (${filter.isFcr ?? null}::boolean IS NULL OR "isFcr" = ${filter.isFcr ?? null}::boolean)
      AND NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%')
      
    `;
        return priorityData;
    }
    async getPriorityTickets(query) {
        const { type, startDate, endDate, page = 1, limit = 10, search } = query;
        const offset = (page - 1) * limit;
        const typeConditions = {
            roaming: `"ticket_subject" ILIKE '%ROAMING%'`,
            extra: `"ticket_subject" ILIKE '%EKSTRA KUOTA%'`,
            vip: `"isVip" = true`,
            pareto: `"isPareto" = true`,
            urgent: `"ticket_subject" ILIKE '%URGENT%'`,
            cc: `"ticket_subject" ILIKE '%CC%'`,
        };
        const typeCondition = typeConditions[type];
        const searchCondition = search
            ? `AND ("ticket_number" ILIKE '%' || $3 || '%' OR "customer_name" ILIKE '%' || $3 || '%' OR "ticket_subject" ILIKE '%' || $3 || '%')`
            : '';
        const baseParams = search
            ? [startDate, endDate, search]
            : [startDate, endDate];
        const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM "RawOca"
      WHERE "ticket_created" >= $1::timestamptz
        AND "ticket_created" < $2::timestamptz
        AND "statusTiket"
        AND NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%')
        AND ${typeCondition}
        ${searchCondition}
    `;
        const dataQuery = `
      SELECT
        "ticket_number"  AS "ticketNumber",
        "customer_name"  AS "customerName",
        "ticket_subject" AS "subject",
        "channel",
        "last_status"    AS "status",
        "priority",
        "ticket_created" AS "createdAt"
      FROM "RawOca"
      WHERE "ticket_created" >= $1::timestamptz
        AND "ticket_created" < $2::timestamptz
        AND "statusTiket"
        AND NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%')
        AND ${typeCondition}
        ${searchCondition}
      ORDER BY "ticket_created" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
        const [countResult, data] = await Promise.all([
            this.prisma.$queryRawUnsafe(countQuery, ...baseParams),
            this.prisma.$queryRawUnsafe(dataQuery, ...baseParams),
        ]);
        const total = countResult[0]?.total ?? 0;
        return {
            data,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getCsatScore(filter) {
        const { startDate, endDate } = filter;
        const csatScore = await this.prisma.$queryRaw `
  SELECT
    COUNT(*)::int AS "totalSurvey",
    COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END)::int AS "totalDijawab",
    COUNT(CASE WHEN "numeric" >= 4 THEN 1 END)::int AS "totalJawaban45",
    CASE 
      WHEN COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END) = 0 THEN 0
      ELSE (COUNT(CASE WHEN "numeric" >= 4 THEN 1 END)::float / COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END)::float) * 5
    END AS "scorecsat",
    CASE 
      WHEN COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END) = 0 THEN 0
      ELSE (COUNT(CASE WHEN "numeric" >= 4 THEN 1 END)::float / COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END)::float) * 100
    END AS "persencsat"
  FROM "RawCsat"
  WHERE "createdAt" >= ${startDate}::timestamp
    AND "createdAt" < ${endDate}::timestamp;
`;
        if (csatScore[0]?.totalSurvey > 0) {
            return csatScore;
        }
        const fallbackDate = await this.prisma.$queryRaw `
      SELECT DATE("createdAt") AS d
      FROM "RawCsat"
      WHERE "createdAt" < ${endDate}::timestamp
      GROUP BY DATE("createdAt")
      ORDER BY d DESC
      LIMIT 1;
    `;
        if (!fallbackDate[0])
            return csatScore;
        const fallbackStart = fallbackDate[0].d;
        const fallbackEnd = new Date(fallbackDate[0].d);
        fallbackEnd.setDate(fallbackEnd.getDate() + 1);
        const fallbackScore = await this.prisma.$queryRaw `
  SELECT
    COUNT(*)::int AS "totalSurvey",
    COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END)::int AS "totalDijawab",
    COUNT(CASE WHEN "numeric" >= 4 THEN 1 END)::int AS "totalJawaban45",
    CASE 
      WHEN COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END) = 0 THEN 0
      ELSE (COUNT(CASE WHEN "numeric" >= 4 THEN 1 END)::float / COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END)::float) * 5
    END AS "scorecsat",
    CASE 
      WHEN COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END) = 0 THEN 0
      ELSE (COUNT(CASE WHEN "numeric" >= 4 THEN 1 END)::float / COUNT(CASE WHEN "answeredAt" IS NOT NULL THEN 1 END)::float) * 100
    END AS "persencsat"
  FROM "RawCsat"
  WHERE "createdAt" >= ${fallbackStart}::date
    AND "createdAt" < ${fallbackEnd}::date;
`;
        return fallbackScore;
    }
    async getChannelStats(filter) {
        const isFcrColOca = filter.fcrType === 'realisasi' ? client_1.Prisma.sql `"isFcrRealisasi"` : client_1.Prisma.sql `"isFcr"`;
        const stats = await this.prisma.$queryRaw `
    WITH "UnifiedData" AS (
      -- 1. DATA FROM OCA (Your existing structure)
      SELECT 
        "channel", "statusTiket", "inSla", "last_status", "product", 
        "resolve_time", "ticket_created", ${isFcrColOca} as "isFcr", "isPareto",
        'OCA' as "source_origin", -- Tagging the source just in case
        'OCA' as "source_kip" 
      FROM "RawOca"
      WHERE "ticket_created" BETWEEN ${filter.startDate}::timestamp AND ${filter.endDate}::timestamp
      ${client_1.Prisma.raw(this.buildCategoryFilterQuery(filter, 'OCA'))}

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
        'OMNIX' as "source_origin",
        'OMNIX' as "source_kip"
      FROM "RawOmnix"
      WHERE "date_start_interaction" BETWEEN ${filter.startDate}::timestamp AND ${filter.endDate}::timestamp
      ${client_1.Prisma.raw(this.buildCategoryFilterQuery(filter, 'OMNIX'))}
    
      UNION ALL
      SELECT
        "unit_type" as "channel",
        "statusTiket",
        "inSla",
        'closed' as "last_status",
        "product",
        NULL::timestamp as "resolve_time",
        "update_stamp" as "ticket_created",
        ${isFcrColOca} as "isFcr",
        "isPareto",
        'OCA' as "source_origin",
        'CALL' as "source_kip"
      FROM "RawCall"
      WHERE "update_stamp" BETWEEN ${filter.startDate}::timestamp AND ${filter.endDate}::timestamp
      ${client_1.Prisma.raw(this.buildCategoryFilterQuery(filter, 'CALL'))}
    )

    -- 3. THE AGGREGATION (Runs on the combined result above)
    SELECT
        MIN(channel) AS channel,
        source_origin, -- Grab this so we know which table to query for details later
        COUNT(*) FILTER (WHERE "statusTiket" = true)::int as "total",
        
        -- % SLA (Logic reused exactly as is!)
        CASE WHEN COUNT(*) FILTER (WHERE "statusTiket" = true) > 0 
             THEN ROUND((COUNT(*) FILTER (WHERE "inSla" AND "statusTiket")::decimal / NULLIF(COUNT(*) FILTER (WHERE "statusTiket" = true),0)) * 100, 2)
             ELSE 100 END as "pctSla",

        -- Basic Counts
        COUNT(*) FILTER (WHERE NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%') AND "statusTiket" = true)::int as "open",
        COUNT(*) FILTER (WHERE ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%')  AND "statusTiket" = true)::int as "closed",

        -- Product Specifics
        COUNT(*) FILTER (WHERE NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%') AND "product" = 'CONNECTIVITY')::int as "connOpen",
        COUNT(*) FILTER (WHERE NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%') AND "product" = 'SOLUTION')::int as "solOpen",
        
        -- Logic: Status is Open AND Current Time - Created Time > Limit
        COUNT(*) FILTER (WHERE NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%') 
            AND "product" = 'CONNECTIVITY' 
            AND (NOW() - "ticket_created") > interval '3 hours')::int as "connOpenOver3h",

        COUNT(*) FILTER (WHERE NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%') 
            AND "product" = 'SOLUTION' 
            AND (NOW() - "ticket_created") > interval '6 hours')::int as "solOpenOver6h",

        -- 3. NEW: Open & Near Time Limit (Warning Zone)
        -- Logic: Status is Open AND Age is between Warning Threshold and Limit
        
        -- Connectivity: > 2 hours but <= 3 hours
        COUNT(*) FILTER (WHERE NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%') 
            AND "product" = 'CONNECTIVITY' 
            AND (NOW() - "ticket_created") > interval '2 hours' 
            AND (NOW() - "ticket_created") <= interval '3 hours')::int as "connOpenNear3h",

        -- Solution: > 4 hours but <= 6 hours (Assuming a 2-hour warning window)
        COUNT(*) FILTER (WHERE NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%') 
            AND "product" = 'SOLUTION' 
            AND (NOW() - "ticket_created") > interval '4 hours' 
            AND (NOW() - "ticket_created") <= interval '6 hours')::int as "solOpenNear6h",

        -- Resolve Time Logic
        COUNT(*) FILTER (WHERE "product" = 'CONNECTIVITY' AND ("resolve_time" - "ticket_created") > interval '3 hours')::int as "connOver3h",
        COUNT(*) FILTER (WHERE "product" = 'SOLUTION' AND ("resolve_time" - "ticket_created") > interval '6 hours')::int as "solOver6h",

        -- SLA Percentage WITHIN FCR and Pareto
        CASE WHEN COUNT(*) FILTER (WHERE "isFcr" and "statusTiket") > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE "isFcr" AND "inSla" and "statusTiket")::decimal / COUNT(*) FILTER (WHERE "isFcr" and "statusTiket")) * 100, 2) 
            ELSE 0 END as "pctFcr",

        -- SLA Percentage WITHIN Non-FCR
        CASE WHEN COUNT(*) FILTER (WHERE NOT "isFcr" and "statusTiket") > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE NOT "isFcr" AND "inSla" and "statusTiket")::decimal / COUNT(*) FILTER (WHERE NOT "isFcr" and "statusTiket")) * 100, 2) 
            ELSE 0 END as "pctNonFcr",

        -- SLA Percentage WITHIN Pareto
        CASE WHEN COUNT(*) FILTER (WHERE "isPareto" = true and "statusTiket") > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE "isPareto" = true AND "inSla" and "statusTiket")::decimal / COUNT(*) FILTER (WHERE "isPareto" = true and "statusTiket")) * 100, 2) 
            ELSE 0 END as "pctPareto",

        -- SLA Percentage WITHIN Non-Pareto
        CASE WHEN COUNT(*) FILTER (WHERE "isPareto" = false and "statusTiket") > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE "isPareto" = false AND "inSla" and "statusTiket")::decimal / COUNT(*) FILTER (WHERE "isPareto" = false and "statusTiket")) * 100, 2) 
            ELSE 0 END as "pctNotPareto"

    FROM "UnifiedData"
    WHERE (${filter.isFcr ?? null}::boolean IS NULL OR "isFcr" = ${filter.isFcr ?? null}::boolean)
    GROUP BY LOWER("channel"), "source_origin"
  `;
        const enhancedStats = await Promise.all(stats.map(async (stat) => {
            const topCorp = await this.getTopEntityForChannel(filter, stat.channel, 'nama_perusahaan', stat.source_origin, stat.source_kip);
            const topKip = await this.getTopEntityForChannel(filter, stat.channel, 'detail_category', stat.source_origin, stat.source_kip);
            return { ...stat, topCorporate: topCorp, topKip: topKip };
        }));
        return enhancedStats;
    }
    async getTopEntityForChannel(filter, channel, metricType, source, sourceKip) {
        let tableName = '';
        let metricColumn = '';
        let dateColumn = '';
        let channelColumn = '';
        if (source === 'OCA' || source === 'CALL') {
            if (sourceKip === 'CALL') {
                tableName = '"RawCall"';
                dateColumn = '"update_stamp"';
                channelColumn = '"unit_type"';
                metricColumn = (metricType === 'nama_perusahaan')
                    ? '"corp"'
                    : '"topic_reason_2"';
            }
            else {
                tableName = '"RawOca"';
                metricColumn = `"${metricType}"`;
                dateColumn = '"ticket_created"';
                channelColumn = '"channel"';
            }
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
        const isFcrColOca = filter.fcrType === 'realisasi' ? '"isFcrRealisasi"' : '"isFcr"';
        const result = await this.prisma.$queryRawUnsafe(`
    WITH "UnifiedDetail" AS (
      -- 1. DATA FROM OCA
      SELECT 
        "channel",
        ${metricType === 'nama_perusahaan' ? '"nama_perusahaan"' : '"detail_category"'} as "metric_name",
        "ticket_created" as "date_ref",
        "eskalasi",
        ${isFcrColOca} as "isFcr",
        "statusTiket"
      FROM "RawOca"
      WHERE "channel" = $1 ${this.buildCategoryFilterQuery(filter, 'OCA')}

      UNION ALL

      -- 2. DATA FROM CALL (Only if the channel is callcenter or source is CALL)
      SELECT 
        'callcenter' as "channel",
        ${metricType === 'nama_perusahaan' ? '"corp"' : '"topic_reason_2"'} as "metric_name",
        "update_stamp" as "date_ref",
        "eskalasi", -- Fallback for missing column
        ${isFcrColOca} as "isFcr",
        "statusTiket"
      FROM "RawCall"
      WHERE 'callcenter' = $1

      UNION ALL

      -- 3. DATA FROM OMNIX
      SELECT 
        "channel_name" as "channel",
        ${metricType === 'nama_perusahaan' ? '"ticket_perusahaan"' : '"subCategory"'} as "metric_name",
        "date_start_interaction" as "date_ref",
        "eskalasi",
        ${isFcrColOca} as "isFcr",
        "statusTiket"
      FROM "RawOmnix"
      WHERE "channel_name" = $1 ${this.buildCategoryFilterQuery(filter, 'OMNIX')}
    )
    SELECT 
      "metric_name" as name, 
      COUNT(*)::int as total, 
      COUNT(*) FILTER (WHERE "eskalasi" <> '' AND "eskalasi" IS NOT NULL)::int as ticket, 
      CASE WHEN COUNT(*) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE "isFcr")::decimal / COUNT(*)) * 100, 2) 
        ELSE 0 END as "pctFcr"
    FROM "UnifiedDetail"
    WHERE "channel" = $1 
      AND ("metric_name" IS NOT NULL AND TRIM("metric_name"::text) NOT IN ('', '-'))
      AND "statusTiket" = true
      AND "date_ref" BETWEEN $2::timestamp AND $3::timestamp
      AND ($4::boolean IS NULL OR "isFcr" = $4::boolean)
    GROUP BY "metric_name"
    ORDER BY total DESC
    LIMIT 5
    `, channel, filter.startDate, filter.endDate, filter.isFcr ?? null);
        return result || [];
    }
    async getEscalationSummary(query) {
        const { page, limit, search, startDate, endDate } = query;
        const skip = ((page ? page : 1) - 1) * (limit ? limit : 10);
        const limitVal = limit ? limit : 10;
        const summary = await this.prisma.$queryRaw `
      SELECT 
        "eskalasi" as type,
        COUNT(*) FILTER (WHERE "last_status" = 'Open')::int as "totalOpen",
        COUNT(*) FILTER (WHERE ("resolve_time" - "ticket_created") > interval '3 hours')::int as "over3h"
      FROM "RawOca"
      WHERE "eskalasi" IS NOT NULL AND "eskalasi" != ''
        AND "ticket_created" BETWEEN ${startDate}::timestamp AND ${endDate}::timestamp
        ${client_1.Prisma.raw(this.buildCategoryFilterQuery(query, 'OCA'))}
      GROUP BY "eskalasi"
    `;
        const whereClause = {
            eskalasi: { not: '' },
            ticketCreated: {
                gte: new Date(startDate ? startDate : new Date()),
                lte: new Date(endDate ? endDate : new Date()),
            },
            ...this.buildPrismaCategoryFilter(query, 'OCA'),
            OR: search
                ? [
                    { ticketNumber: { contains: search, mode: 'insensitive' } },
                    { idRemedyNo: { contains: search, mode: 'insensitive' } },
                ]
                : undefined,
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
                    eskalasi: true,
                },
                skip: Number(skip),
                take: Number(limitVal),
                orderBy: { ticketCreated: 'desc' },
            }),
        ]);
        return {
            summary,
            list: { data, total, page, limitVal },
        };
    }
    async getSpecialAccountStats(filter, type) {
        const isVip = type === 'VIP';
        const condition = isVip
            ? `WHERE "isVip" = true`
            : `WHERE "isPareto" = true AND "isVip" = false`;
        const unifiedCte = `
            WITH "UnifiedSpecial" AS (
                -- OCA DATA
                SELECT 
                    "isVip", 
                    "isPareto", 
                    "last_status", 
                    "resolve_time", 
                    "ticket_created", 
                    "nama_perusahaan",
                    "detail_category",
                    "inSla",
                    "statusTiket"
                FROM "RawOca"
                WHERE "ticket_created" BETWEEN $1::timestamp AND $2::timestamp AND "statusTiket"
                    AND (TRIM("nama_perusahaan") <> '-' AND TRIM("nama_perusahaan") <> '' AND "nama_perusahaan" NOTNULL)
                    ${this.buildCategoryFilterQuery(filter, 'OCA')}

                UNION ALL

                -- OMNIX DATA (Mapped)
                SELECT 
                    "isVip",                   -- Map Omnix VIP column
                    "isPareto",             -- Map Omnix Pareto (or false if not exists)
                    "ticket_status_name" as "last_status",             -- Map Status
                    "date_close" as "resolve_time",       -- Map Resolve Time
                    "date_start_interaction" as "ticket_created",      -- Map Created Time
                    "ticket_perusahaan" as "nama_perusahaan",   -- Map Company Name
                    "subCategory" as "detail_category",
                    "inSla",
                    "statusTiket"
                FROM "RawOmnix"
                WHERE "date_start_interaction" BETWEEN $1::timestamp AND $2::timestamp AND "statusTiket"
                  AND (TRIM("ticket_perusahaan") <> '-' AND TRIM("ticket_perusahaan") <> '' AND "ticket_perusahaan" NOTNULL)
                  ${this.buildCategoryFilterQuery(filter, 'OMNIX')}
            )
        `;
        const rawQuery = `
            ${unifiedCte}
            SELECT 
                    COUNT(*) FILTER (
        WHERE "statusTiket"
          AND NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%')
    )::int AS "openTickets",
                COUNT(*) FILTER (WHERE ("resolve_time" - "ticket_created") > interval '3 hours')::int as "over3h"
            FROM "UnifiedSpecial"
            ${condition} 
            -- Note: Date filter is already applied inside the CTE for performance
        `;
        const corpQuery = `
            ${unifiedCte}
            SELECT TRIM("nama_perusahaan") as nama_perusahaan, COUNT(*)::int as total
            FROM "UnifiedSpecial"
            ${condition}
            GROUP BY TRIM("nama_perusahaan") 
            ORDER BY total DESC
            LIMIT 10
        `;
        const kipQuery = `
            ${unifiedCte}
            SELECT 
                "detail_category",
                COUNT(*) FILTER (WHERE "inSla" = true AND "statusTiket")::int as "inSla",
                COUNT(*) FILTER (WHERE "inSla" = false AND "statusTiket")::int as "outSla",
                COUNT(*)::int as "total"
            FROM "UnifiedSpecial"
            ${condition}
            GROUP BY "detail_category"
            ORDER BY "total" DESC
            LIMIT 10
    `;
        const [stats, topCorps, topKips] = await Promise.all([
            this.prisma.$queryRawUnsafe(rawQuery, filter.startDate, filter.endDate),
            this.prisma.$queryRawUnsafe(corpQuery, filter.startDate, filter.endDate),
            this.prisma.$queryRawUnsafe(kipQuery, filter.startDate, filter.endDate),
        ]);
        return {
            stats: stats[0] || { openTickets: 0, over3h: 0 },
            topCorps,
            topKips,
        };
    }
    async getTopKipPerCompany(query) {
        const { page, limit, search, startDate, endDate } = query;
        const pageVal = page ? page : 1;
        const limitVal = limit ? limit : 10;
        const offset = (pageVal - 1) * limitVal;
        const unifiedCte = `
        WITH "UnifiedData" AS (
            SELECT 
                "nama_perusahaan", 
                "detail_category",
                "statusTiket",
                "inSla"
            FROM "RawOca"
            WHERE "ticket_created" BETWEEN $1::timestamp AND $2::timestamp AND "statusTiket"
              AND (TRIM("nama_perusahaan") <> '-' AND TRIM("nama_perusahaan") <> '' AND "nama_perusahaan" NOTNULL)
              ${this.buildCategoryFilterQuery(query, 'OCA')}
            
            UNION ALL
            
            SELECT 
                "ticket_perusahaan" as "nama_perusahaan", 
                "subCategory" as "detail_category",
                "statusTiket",
                "inSla"
            FROM "RawOmnix"
            WHERE "date_start_interaction" BETWEEN $1::timestamp AND $2::timestamp AND "statusTiket"
            AND (TRIM("ticket_perusahaan") <> '-' AND TRIM("ticket_perusahaan") <> '' AND "ticket_perusahaan" NOTNULL)
            ${this.buildCategoryFilterQuery(query, 'OMNIX')}
        )
    `;
        const searchCondition = search
            ? `AND "nama_perusahaan" ILIKE '%' || $3 || '%'`
            : '';
        const queryParams = search
            ? [startDate, endDate, search]
            : [startDate, endDate];
        const countQuery = `
        ${unifiedCte}
        SELECT COUNT(DISTINCT "nama_perusahaan")::int as total
        FROM "UnifiedData"
        WHERE 1=1
        ${searchCondition}
    `;
        const companyQuery = `
        ${unifiedCte}
        SELECT 
            "nama_perusahaan", 
            COUNT(*)::int as total_tickets,
            CASE WHEN COUNT(*) FILTER (WHERE "statusTiket" = true) > 0 
                 THEN ROUND(
                    (COUNT(*) FILTER (WHERE "inSla" AND "statusTiket")::decimal / 
                     COUNT(*) FILTER (WHERE "statusTiket" = true)::decimal) * 100, 2
                 )
                 ELSE 0 
            END as "company_sla"
        FROM "UnifiedData"
        WHERE 1=1
        ${searchCondition}
        GROUP BY "nama_perusahaan"
        ORDER BY total_tickets DESC
        LIMIT ${limitVal} OFFSET ${offset}
    `;
        const [totalResult, companies] = await Promise.all([
            this.prisma.$queryRawUnsafe(countQuery, ...queryParams),
            this.prisma.$queryRawUnsafe(companyQuery, ...queryParams),
        ]);
        const totalRows = totalResult[0]?.total || 0;
        if (companies.length === 0) {
            return {
                data: [],
                meta: {
                    page: Number(pageVal),
                    limit: Number(limitVal),
                    total: Number(totalRows),
                    totalPages: 0,
                },
            };
        }
        const companyNames = companies.map((c) => c.nama_perusahaan);
        const kipsParams = [startDate, endDate, ...companyNames];
        const placeholders = companyNames.map((_, i) => `$${i + 3}`).join(', ');
        const kipsQuery = `
        ${unifiedCte}
        , RankedKip AS (
            SELECT 
                "nama_perusahaan", 
                "detail_category", 
                COUNT(*)::int as kip_count,
                CASE WHEN COUNT(*) FILTER (WHERE "statusTiket" = true) > 0 
                     THEN ROUND(
                        (COUNT(*) FILTER (WHERE "inSla" AND "statusTiket")::decimal / 
                         COUNT(*) FILTER (WHERE "statusTiket" = true)::decimal) * 100, 2
                     )
                     ELSE 0 
                END as "kip_sla",
                ROW_NUMBER() OVER(PARTITION BY "nama_perusahaan" ORDER BY COUNT(*) DESC)::int as rn
            FROM "UnifiedData"
            WHERE "nama_perusahaan" IN (${placeholders}) 
            GROUP BY "nama_perusahaan", "detail_category"
        )
        SELECT * FROM RankedKip WHERE rn <= 3
    `;
        const kips = await this.prisma.$queryRawUnsafe(kipsQuery, ...kipsParams);
        const mappedData = companies.map((comp) => {
            return {
                company: comp.nama_perusahaan,
                totalTickets: comp.total_tickets,
                companySla: comp.company_sla,
                topKips: kips
                    .filter((k) => k.nama_perusahaan === comp.nama_perusahaan)
                    .map((k) => ({
                    detail_category: k.detail_category,
                    kip_count: k.kip_count,
                    kip_sla: k.kip_sla,
                    rn: k.rn,
                })),
            };
        });
        return {
            data: mappedData,
            meta: {
                page: Number(pageVal),
                limit: Number(limitVal),
                total: Number(totalRows),
                totalPages: Math.ceil(Number(totalRows) / Number(limitVal)),
            },
        };
    }
    async getProductBreakdown(filter) {
        const unifiedCte = `
        WITH "UnifiedData" AS (
            -- Table 1: RawOca
            SELECT 
                "product", 
                "last_status", 
                "resolve_time", 
                "ticket_created", 
                "statusTiket", 
                "inSla", 
                "detail_category",               -- Used for Top KIPs (existing)
                "sub_category" as "general_category", -- NEW: Used for Top 5 Category
                "channel"
            FROM "RawOca"
            WHERE "ticket_created" >= $1::timestamptz AND "ticket_created" < $2::timestamptz 
            AND "statusTiket"
            AND "channel" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
            ${this.buildCategoryFilterQuery(filter, 'OCA')}

            
            UNION ALL
            
            -- Table 2: RawOmnix
            SELECT 
                "product", 
                "ticket_status_name" as "last_status", 
                "date_close" as "resolve_time", 
                "date_start_interaction" as "ticket_created", 
                "statusTiket", 
                "inSla", 
                "subCategory" as "detail_category", -- Used for Top KIPs (existing)
                "category" as "general_category",    -- NEW: Used for Top 5 Category
                "channel_name" as "channel"
            FROM "RawOmnix"
            WHERE "date_start_interaction" >= $1::timestamp AND "date_start_interaction" < $2::timestamp
            AND "statusTiket"
            AND "channel_name" ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'])
            ${this.buildCategoryFilterQuery(filter, 'OMNIX')}

        )
    `;
        const dailyStatsRaw = await this.prisma.$queryRawUnsafe(`
        ${unifiedCte}
        SELECT 
            "product",
            TO_CHAR("ticket_created" + interval '7 hours', 'YYYY-MM-DD') as "date",
            COUNT(*)::int as "total",
            CASE WHEN COUNT(*) FILTER (WHERE "statusTiket" = true) > 0 
                 THEN ROUND(
                    (COUNT(*) FILTER (WHERE "inSla" AND "statusTiket")::decimal / 
                     COUNT(*) FILTER (WHERE "statusTiket" = true)::decimal) * 100, 2
                 )
                 ELSE 0 
            END as "dailySla"
        FROM "UnifiedData"
        WHERE "product" IN ('CONNECTIVITY', 'SOLUTION', 'DADS')
        GROUP BY "product", TO_CHAR("ticket_created" + interval '7 hours', 'YYYY-MM-DD')
        ORDER BY "date" ASC
    `, filter.startDate, filter.endDate);
        const products = await this.prisma.$queryRawUnsafe(`
        ${unifiedCte}
        SELECT 
            "product",
            COUNT(*)::int as "total",
            COUNT(*) FILTER (WHERE NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%'))::int as "open",
            COUNT(*) FILTER (WHERE NOT "inSla")::int as "over3h",
            CASE WHEN COUNT(*) FILTER (WHERE "statusTiket" = true) > 0 
                 THEN ROUND(
                    (COUNT(*) FILTER (WHERE "inSla" AND "statusTiket")::decimal / 
                     COUNT(*) FILTER (WHERE "statusTiket" = true)::decimal) * 100, 2
                 )
                 ELSE 0 
            END as "pctSla"
        FROM "UnifiedData"
        WHERE "product" IN ('CONNECTIVITY', 'SOLUTION', 'DADS')
        GROUP BY "product"
    `, filter.startDate, filter.endDate);
        const detailed = await Promise.all(products.map(async (p) => {
            const topKips = await this.prisma.$queryRawUnsafe(`
            ${unifiedCte}
            SELECT 
                "detail_category", 
                COUNT(*)::int as total,
                CASE WHEN COUNT(*) > 0 
                     THEN ROUND((COUNT(*) FILTER (WHERE "inSla" AND "statusTiket")::decimal / COUNT(*)) * 100, 2) 
                     ELSE 0 
                END as "kipSla"
            FROM "UnifiedData"
            WHERE "product" = $3 
              AND (TRIM("detail_category") <> '-' AND TRIM("detail_category") <> '' AND "detail_category" NOTNULL)
            GROUP BY "detail_category"
            ORDER BY total DESC
            LIMIT 10
        `, filter.startDate, filter.endDate, p.product);
            const topCategories = await this.prisma.$queryRawUnsafe(`
            ${unifiedCte}
            SELECT 
                "general_category", 
                COUNT(*)::int as total,
                CASE WHEN COUNT(*) > 0 
                     THEN ROUND((COUNT(*) FILTER (WHERE "inSla" AND "statusTiket")::decimal / COUNT(*)) * 100, 2) 
                     ELSE 0 
                END as "catSla"
            FROM "UnifiedData"
            WHERE "product" = $3
              AND (TRIM("general_category") <> '-' AND TRIM("general_category") <> '' AND "general_category" NOTNULL)
            GROUP BY "general_category"
            ORDER BY total DESC
            LIMIT 5
        `, filter.startDate, filter.endDate, p.product);
            const trend = dailyStatsRaw.filter((d) => d.product === p.product);
            return {
                ...p,
                topKips,
                topCategories,
                trend,
            };
        }));
        return detailed;
    }
    async getEboOrGtmEscalation(query, eskalasi) {
        const { page = 1, limit = 10, search, startDate, endDate } = query;
        const skip = (page - 1) * limit;
        const whereClause = {
            eskalasi: eskalasi,
            ticketCreated: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
            },
            ...this.buildPrismaCategoryFilter(query, 'OCA'),
            NOT: {
                OR: [
                    { lastStatus: { startsWith: 'close', mode: 'insensitive' } },
                    { lastStatus: { startsWith: 'resolve', mode: 'insensitive' } },
                ],
            },
            ...(search && {
                OR: [
                    { ticketNumber: { contains: search, mode: 'insensitive' } },
                    { projectId: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [summaryRaw, totalItems, rawData] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT 
          COUNT(*) FILTER (WHERE  NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%'))::int as "totalOpen",
          -- Convert UTC to WIB before calculating if it's over 3H
          COUNT(*) FILTER (WHERE (now() AT TIME ZONE 'Asia/Jakarta') - 
                                 ("ticket_created" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') > interval '3 hours'
                                 AND NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%'))::int as "over3H"
        FROM "RawOca"
        WHERE "eskalasi" = ${eskalasi}
          AND "ticket_created" >= ${startDate}::timestamptz AND "ticket_created" < ${endDate}::timestamptz
          ${client_1.Prisma.raw(this.buildCategoryFilterQuery(query, 'OCA'))}
      `,
            this.prisma.rawOca.count({ where: whereClause }),
            this.prisma.rawOca.findMany({
                where: whereClause,
                select: {
                    ticketCreated: true,
                    ticketNumber: true,
                    projectId: true,
                    resolveTime: true,
                    lastStatus: true,
                    description: true,
                },
                skip: Number(skip),
                take: Number(limit),
                orderBy: { ticketCreated: 'desc' },
            }),
        ]);
        const summary = summaryRaw[0] || { totalOpen: 0, over3H: 0 };
        const data = rawData.map((item) => {
            const wibOffset = 7 * 60 * 60 * 1000;
            const ticketWib = item.ticketCreated
                ? new Date(item.ticketCreated.getTime() + wibOffset)
                : null;
            const resolveWib = item.resolveTime
                ? new Date(item.resolveTime.getTime() + wibOffset)
                : null;
            let durationStr = '00:00:00';
            const now = new Date();
            const diffMs = now.getTime() - (item?.ticketCreated?.getTime() || 0);
            const hrs = Math.floor(diffMs / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);
            const secs = Math.floor((diffMs % 60000) / 1000);
            durationStr = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            const { caseId, unitId } = this.extractCaseIdAndUnitId(item.description || '');
            return {
                date: ticketWib
                    ? ticketWib.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        timeZone: 'UTC',
                    })
                    : '',
                idTicket: item.ticketNumber,
                idCase: caseId,
                duration: durationStr,
                actName: item.lastStatus,
                unitId: unitId,
            };
        });
        return {
            summary: {
                totalOpen: summary.totalOpen,
                over3H: summary.over3H,
            },
            data,
            meta: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalItems / (limit || 10)),
                totalItems: totalItems,
            },
        };
    }
    async getBillcoEscalation(query) {
        const { page = 1, limit = 10, search, startDate, endDate } = query;
        const skip = (page - 1) * limit;
        const accountMap = await this.createLookupMap(this.prisma.accountMapping, 'corporateName', 'group');
        const whereClause = {
            eskalasi: 'Billco',
            ticketCreated: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
            },
            ...this.buildPrismaCategoryFilter(query, 'OCA'),
            NOT: {
                OR: [
                    { lastStatus: { startsWith: 'close', mode: 'insensitive' } },
                    { lastStatus: { startsWith: 'resolve', mode: 'insensitive' } },
                ],
            },
            ...(search && {
                OR: [
                    { ticketNumber: { contains: search, mode: 'insensitive' } },
                    { projectId: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [summaryRaw, totalItems, rawData] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT 
          COUNT(*) FILTER (WHERE  NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%'))::int as "totalOpen",
          -- Convert UTC to WIB before calculating if it's over 3H
          COUNT(*) FILTER (WHERE (now() AT TIME ZONE 'Asia/Jakarta') - 
                                 ("ticket_created" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') > interval '3 hours'
                                 AND NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%'))::int as "over3H"
        FROM "RawOca"
        WHERE "eskalasi" = 'Billco'
          AND "ticket_created" >= ${startDate}::timestamptz AND "ticket_created" < ${endDate}::timestamptz
          ${client_1.Prisma.raw(this.buildCategoryFilterQuery(query, 'OCA'))}
      `,
            this.prisma.rawOca.count({ where: whereClause }),
            this.prisma.rawOca.findMany({
                where: whereClause,
                select: {
                    ticketCreated: true,
                    ticketNumber: true,
                    detailCategory: true,
                    namaPerusahaan: true,
                },
                skip: Number(skip),
                take: Number(limit),
                orderBy: { ticketCreated: 'desc' },
            }),
        ]);
        const summary = summaryRaw[0] || { totalOpen: 0, over3H: 0 };
        const data = rawData.map((item) => {
            const wibOffset = 7 * 60 * 60 * 1000;
            const ticketWib = item.ticketCreated
                ? new Date(item.ticketCreated.getTime() + wibOffset)
                : null;
            return {
                date: ticketWib
                    ? ticketWib.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        timeZone: 'UTC',
                    })
                    : '',
                idTicket: item.ticketNumber,
                kip: item.detailCategory,
                lob: accountMap.get(item?.namaPerusahaan?.trim().toLowerCase() || '') || 'Unknown',
            };
        });
        return {
            summary: {
                totalOpen: summary.totalOpen,
                over3H: summary.over3H,
            },
            data,
            meta: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalItems / (limit || 10)),
                totalItems: totalItems,
            },
        };
    }
    async getItEscalation(query) {
        const { page = 1, limit = 10, search, startDate, endDate } = query;
        const skip = (page - 1) * limit;
        const whereClause = {
            eskalasi: 'IT',
            ticketCreated: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
            },
            ...this.buildPrismaCategoryFilter(query, 'OCA'),
            NOT: {
                OR: [
                    { lastStatus: { startsWith: 'close', mode: 'insensitive' } },
                    { lastStatus: { startsWith: 'resolve', mode: 'insensitive' } },
                ],
            },
            ...(search && {
                OR: [
                    { ticketNumber: { contains: search, mode: 'insensitive' } },
                    { projectId: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [summaryRaw, totalItems, rawData] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT 
          COUNT(*) FILTER (WHERE  NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%'))::int as "totalOpen",
          -- Convert UTC to WIB before calculating if it's over 3H
        COUNT(*) FILTER (WHERE 
  (now() AT TIME ZONE 'Asia/Jakarta') - 
  ("ticket_created" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') > interval '3 hours'
  AND NOT ("last_status" ILIKE 'close%' OR "last_status" ILIKE 'resolve%')
)::int as "over3H"
        FROM "RawOca"
        WHERE "eskalasi" = 'IT'
          AND "ticket_created" >= ${startDate}::timestamptz AND "ticket_created" < ${endDate}::timestamptz
          ${client_1.Prisma.raw(this.buildCategoryFilterQuery(query, 'OCA'))}
      `,
            this.prisma.rawOca.count({ where: whereClause }),
            this.prisma.rawOca.findMany({
                where: whereClause,
                select: {
                    ticketCreated: true,
                    ticketNumber: true,
                    eskalasiIdRemedyItAoEms: true,
                    resolveTime: true,
                },
                skip: Number(skip),
                take: Number(limit),
                orderBy: { ticketCreated: 'desc' },
            }),
        ]);
        const summary = summaryRaw[0] || { totalOpen: 0, over3H: 0 };
        const data = rawData.map((item) => {
            const wibOffset = 7 * 60 * 60 * 1000;
            const ticketWib = item.ticketCreated
                ? new Date(item.ticketCreated.getTime() + wibOffset)
                : null;
            const resolveWib = item.resolveTime
                ? new Date(item.resolveTime.getTime() + wibOffset)
                : null;
            let durationStr = '00:00:00';
            const now = new Date();
            const diffMs = now.getTime() - (item?.ticketCreated?.getTime() || 0);
            const hrs = Math.floor(diffMs / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);
            const secs = Math.floor((diffMs % 60000) / 1000);
            durationStr = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            const idRemedy = item.eskalasiIdRemedyItAoEms?.match(/INC\d{12}/i);
            return {
                date: ticketWib
                    ? ticketWib.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        timeZone: 'UTC',
                    })
                    : '',
                idTicket: item.ticketNumber,
                idRemedy: idRemedy ? idRemedy[0] : null,
                duration: durationStr,
            };
        });
        return {
            summary: {
                totalOpen: summary.totalOpen,
                over3H: summary.over3H,
            },
            data,
            meta: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalItems / (limit || 10)),
                totalItems: totalItems,
            },
        };
    }
    async createLookupMap(modelDelegate, keyField, valueField) {
        const data = await modelDelegate.findMany({
            select: {
                [keyField]: true,
                [valueField]: true,
            },
        });
        const lookupMap = new Map();
        for (const row of data) {
            const rawKey = row[keyField];
            const value = row[valueField];
            if (rawKey && typeof rawKey === 'string') {
                lookupMap.set(rawKey.trim().toLowerCase(), value || '');
            }
        }
        return lookupMap;
    }
    extractCaseIdAndUnitId(input) {
        const siteMatch = input.match(/B2b_site\d{3}/i);
        const unitId = siteMatch ? siteMatch[0] : null;
        let caseId = null;
        const labeledMatch = input.match(/Case ID:\s*(1-[A-Z0-9]{7})/i);
        if (labeledMatch) {
            caseId = labeledMatch[1];
        }
        else {
            const remainingText = input.replace(/^B2b_site\d{3}/, '');
            const immediateMatch = remainingText.match(/^1-[A-Z0-9]{7}/i);
            if (immediateMatch) {
                caseId = immediateMatch[0];
            }
        }
        return { unitId, caseId };
    }
    cachedFilterOptions = null;
    lastCacheTime = 0;
    async getFilterOptions() {
        const now = Date.now();
        if (this.cachedFilterOptions && now - this.lastCacheTime < 1000 * 60 * 60) {
            return this.cachedFilterOptions;
        }
        try {
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            const ocaCat = await this.prisma.rawOca.findMany({ where: { ticketCreated: { gte: last30Days } }, distinct: ['category'], select: { category: true } });
            const ocaSub = await this.prisma.rawOca.findMany({ where: { ticketCreated: { gte: last30Days } }, distinct: ['subCategory'], select: { subCategory: true } });
            const ocaDet = await this.prisma.rawOca.findMany({ where: { ticketCreated: { gte: last30Days } }, distinct: ['detailCategory'], select: { detailCategory: true } });
            const omnixCat = await this.prisma.rawOmnix.findMany({ where: { dateStartInteraction: { gte: last30Days } }, distinct: ['mainCategory'], select: { mainCategory: true } });
            const omnixSub = await this.prisma.rawOmnix.findMany({ where: { dateStartInteraction: { gte: last30Days } }, distinct: ['category'], select: { category: true } });
            const omnixDet = await this.prisma.rawOmnix.findMany({ where: { dateStartInteraction: { gte: last30Days } }, distinct: ['subCategory'], select: { subCategory: true } });
            const callCat = await this.prisma.rawCall.findMany({ where: { updateStamp: { gte: last30Days } }, distinct: ['topicReason1'], select: { topicReason1: true } });
            const callSub = await this.prisma.rawCall.findMany({ where: { updateStamp: { gte: last30Days } }, distinct: ['topicReason2'], select: { topicReason2: true } });
            const callDet = await this.prisma.rawCall.findMany({ where: { updateStamp: { gte: last30Days } }, distinct: ['topicResult'], select: { topicResult: true } });
            const categories = new Set([
                ...ocaCat.map(c => c.category),
                ...omnixCat.map(c => c.mainCategory),
                ...callCat.map(c => c.topicReason1),
            ].filter(Boolean));
            const subCategories = new Set([
                ...ocaSub.map(c => c.subCategory),
                ...omnixSub.map(c => c.category),
                ...callSub.map(c => c.topicReason2),
            ].filter(Boolean));
            const detailCategories = new Set([
                ...ocaDet.map(c => c.detailCategory),
                ...omnixDet.map(c => c.subCategory),
                ...callDet.map(c => c.topicResult),
            ].filter(Boolean));
            this.cachedFilterOptions = {
                categories: Array.from(categories).sort(),
                subCategories: Array.from(subCategories).sort(),
                detailCategories: Array.from(detailCategories).sort(),
            };
            this.lastCacheTime = now;
            return this.cachedFilterOptions;
        }
        catch (e) {
            console.error('Failed to get filter options:', e.message);
            return this.cachedFilterOptions || { categories: [], subCategories: [], detailCategories: [] };
        }
    }
};
exports.OcaOmnixService = OcaOmnixService;
exports.OcaOmnixService = OcaOmnixService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OcaOmnixService);
//# sourceMappingURL=oca-omnix.service.js.map