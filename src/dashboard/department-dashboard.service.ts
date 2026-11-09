import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { fcrExpression } from './fcr-expression';

type Department = 'FCR' | 'NON FCR' | 'UNRESOLVED';
interface DepartmentRow {
  department: Department;
  name: string | null;
  total: number;
  open: number;
  closed: number;
  slaEligible: number;
  slaAchieved: number;
  realisasiEligible: number;
  realisasiAchieved: number;
}

@Injectable()
export class DepartmentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(filter: DashboardFilterDto) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`NULLIF(BTRIM(ticket_number), '') IS NOT NULL`,
    ];
    const dateConditions: Prisma.Sql[] = [];
    if (filter.startDate)
      dateConditions.push(
        Prisma.sql`ticket_created >= ${filter.startDate}::timestamptz`,
      );
    if (filter.endDate)
      dateConditions.push(
        Prisma.sql`ticket_created < ${filter.endDate}::timestamptz`,
      );
    if (dateConditions.length) {
      conditions.push(Prisma.sql`(
        REGEXP_REPLACE(UPPER(BTRIM(department)), '[[:space:]_-]+', ' ', 'g') = 'TIKET UNRESOLVED'
        OR (${Prisma.join(dateConditions, ' AND ')})
      )`);
    }
    if (filter.categories?.length)
      conditions.push(
        Prisma.sql`category IN (${Prisma.join(filter.categories)})`,
      );
    if (filter.subCategories?.length)
      conditions.push(
        Prisma.sql`sub_category IN (${Prisma.join(filter.subCategories)})`,
      );
    if (filter.detailCategories?.length)
      conditions.push(
        Prisma.sql`detail_category IN (${Prisma.join(filter.detailCategories)})`,
      );

    const rows = await this.prisma.$queryRaw<DepartmentRow[]>(Prisma.sql`
      WITH normalized AS (
        SELECT BTRIM(ticket_number) AS ticket_id,
          REGEXP_REPLACE(UPPER(BTRIM(department)), '[[:space:]_-]+', ' ', 'g') AS department,
          COALESCE(NULLIF(NULLIF(BTRIM(assignee), ''), '-'), 'Belum ditugaskan') AS agent,
          COALESCE(NULLIF(NULLIF(BTRIM(last_status), ''), '-'), 'Status belum diisi') AS status,
          COALESCE(BTRIM(last_status) ILIKE 'close%' OR BTRIM(last_status) ILIKE 'resolve%', false) AS closed,
          "statusTiket", "inSla", channel,
          ${fcrExpression('realisasi', 'OCA')} AS realisasi
        FROM "RawOca" WHERE ${Prisma.join(conditions, ' AND ')}
      ), tickets AS (
        SELECT *, CASE
          WHEN department IN ('FCR', 'DEPARTEMEN FCR', 'DEPARTMENT FCR') THEN 'FCR'
          WHEN department IN ('NON FCR', 'DEPARTEMEN NON FCR', 'DEPARTMENT NON FCR') THEN 'NON FCR'
          WHEN department = 'TIKET UNRESOLVED' THEN 'UNRESOLVED'
        END AS department_key FROM normalized
      )
      SELECT department_key AS department,
        CASE WHEN GROUPING(CASE WHEN department_key = 'UNRESOLVED' THEN status ELSE agent END) = 1
          THEN NULL ELSE CASE WHEN department_key = 'UNRESOLVED' THEN status ELSE agent END END AS name,
        COUNT(DISTINCT ticket_id)::int AS total,
        COUNT(DISTINCT ticket_id) FILTER (WHERE NOT closed)::int AS open,
        COUNT(DISTINCT ticket_id) FILTER (WHERE closed)::int AS closed,
        COUNT(DISTINCT ticket_id) FILTER (WHERE "statusTiket")::int AS "slaEligible",
        COUNT(DISTINCT ticket_id) FILTER (WHERE "statusTiket" AND "inSla")::int AS "slaAchieved",
        COUNT(DISTINCT ticket_id) FILTER (WHERE "statusTiket" AND realisasi
          AND channel ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter']))::int AS "realisasiEligible",
        COUNT(DISTINCT ticket_id) FILTER (WHERE "statusTiket" AND realisasi AND "inSla"
          AND channel ILIKE ANY (ARRAY['email', 'livechat', 'whatsapp', 'socmed', 'callcenter']))::int AS "realisasiAchieved"
      FROM tickets WHERE department_key IS NOT NULL
        AND (department_key <> 'UNRESOLVED' OR NOT closed)
      GROUP BY GROUPING SETS ((department_key),
        (department_key, CASE WHEN department_key = 'UNRESOLVED' THEN status ELSE agent END))
      ORDER BY total DESC, name ASC
    `);
    return (['FCR', 'NON FCR', 'UNRESOLVED'] as const).map((department) => {
      const summary = rows.find(
        (row) => row.department === department && row.name === null,
      );
      const agentRows = rows.filter(
        (row) => row.department === department && row.name !== null,
      );
      const agentSla = agentRows
        .filter((row) => row.slaEligible > 0)
        .map((row) => (row.slaAchieved / row.slaEligible) * 100);
      const departmentSla =
        department === 'FCR'
          ? summary && summary.realisasiEligible > 0
            ? (summary.realisasiAchieved / summary.realisasiEligible) * 100
            : null
          : department === 'NON FCR' && agentSla.length
            ? agentSla.reduce((sum, value) => sum + value, 0) / agentSla.length
            : null;
      return {
        department,
        total: summary?.total ?? 0,
        open: summary?.open ?? 0,
        closed: summary?.closed ?? 0,
        slaPercentage:
          departmentSla === null ? null : Math.round(departmentSla * 100) / 100,
        breakdown: agentRows.map((row) => ({
          name: row.name!,
          total: row.total,
          open: row.open,
          closed: row.closed,
          slaPercentage:
            row.slaEligible > 0
              ? Math.round((row.slaAchieved / row.slaEligible) * 10000) / 100
              : null,
        })),
      };
    });
  }
}
