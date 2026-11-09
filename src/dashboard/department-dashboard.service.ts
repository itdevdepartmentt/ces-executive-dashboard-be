import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

type Department = 'FCR' | 'NON FCR' | 'UNRESOLVED';
interface DepartmentRow {
  department: Department;
  name: string | null;
  total: number;
  open: number;
  closed: number;
}

@Injectable()
export class DepartmentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(filter: DashboardFilterDto) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`NULLIF(BTRIM(ticket_number), '') IS NOT NULL`,
    ];
    if (filter.startDate)
      conditions.push(
        Prisma.sql`ticket_created >= ${filter.startDate}::timestamptz`,
      );
    if (filter.endDate)
      conditions.push(
        Prisma.sql`ticket_created < ${filter.endDate}::timestamptz`,
      );
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
          COALESCE(BTRIM(last_status) ILIKE 'close%' OR BTRIM(last_status) ILIKE 'resolve%', false) AS closed
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
        COUNT(DISTINCT ticket_id) FILTER (WHERE closed)::int AS closed
      FROM tickets WHERE department_key IS NOT NULL
      GROUP BY GROUPING SETS ((department_key),
        (department_key, CASE WHEN department_key = 'UNRESOLVED' THEN status ELSE agent END))
      ORDER BY total DESC, name ASC
    `);
    return (['FCR', 'NON FCR', 'UNRESOLVED'] as const).map((department) => {
      const summary = rows.find(
        (row) => row.department === department && row.name === null,
      );
      return {
        department,
        total: summary?.total ?? 0,
        open: summary?.open ?? 0,
        closed: summary?.closed ?? 0,
        breakdown: rows
          .filter((row) => row.department === department && row.name !== null)
          .map((row) => ({ name: row.name!, total: row.total })),
      };
    });
  }
}
