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
  openInSla: number;
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
          "statusTiket", "inSla", channel, product, ticket_created,
          ${fcrExpression('realisasi', 'OCA')} AS realisasi
        FROM "RawOca" WHERE ${Prisma.join(conditions, ' AND ')}
      ), dinilai AS (
        SELECT *,
          -- Closed/Resolved retains its recorded SLA; open tickets age at query time.
          CASE
            WHEN closed THEN COALESCE("inSla", false)
            WHEN ticket_created IS NULL OR ticket_created > NOW() THEN false
            WHEN UPPER(BTRIM(COALESCE(product, ''))) = 'CONNECTIVITY'
              THEN NOW() - ticket_created <= interval '3 hours'
            WHEN UPPER(BTRIM(COALESCE(product, ''))) = 'SOLUTION'
              THEN NOW() - ticket_created <= interval '6 hours'
            ELSE false
          END AS in_sla_kini
        FROM normalized
      ), tickets AS (
        SELECT *, CASE
          WHEN department IN ('FCR', 'DEPARTEMEN FCR', 'DEPARTMENT FCR') THEN 'FCR'
          WHEN department IN ('NON FCR', 'DEPARTEMEN NON FCR', 'DEPARTMENT NON FCR') THEN 'NON FCR'
          WHEN department = 'TIKET UNRESOLVED' THEN 'UNRESOLVED'
        END AS department_key FROM dinilai
      )
      SELECT department_key AS department,
        CASE WHEN GROUPING(CASE WHEN department_key = 'UNRESOLVED' THEN status ELSE agent END) = 1
          THEN NULL ELSE CASE WHEN department_key = 'UNRESOLVED' THEN status ELSE agent END END AS name,
        COUNT(DISTINCT ticket_id)::int AS total,
        COUNT(DISTINCT ticket_id) FILTER (WHERE NOT closed)::int AS open,
        COUNT(DISTINCT ticket_id) FILTER (WHERE closed)::int AS closed,
        COUNT(DISTINCT ticket_id) FILTER (WHERE "statusTiket")::int AS "slaEligible",
        COUNT(DISTINCT ticket_id) FILTER (WHERE "statusTiket" AND in_sla_kini)::int AS "slaAchieved",
        COUNT(DISTINCT ticket_id) FILTER (WHERE "statusTiket" AND NOT closed AND in_sla_kini)::int AS "openInSla",
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
      /**
       * Satu rumus untuk semua departemen: tiket valid yang IN SLA dibagi
       * tiket valid, berbobot jumlah tiket — sama persis dengan baris agent
       * di bawahnya dan dengan keterangan yang tertulis di kartu.
       *
       * Sebelumnya FCR memakai rasio realisasi (yang disaring lagi per
       * channel) dan NON FCR memakai rata-rata persentase antar agent tanpa
       * bobot. Akibatnya angka besar di kartu bisa menunjukkan 100% sementara
       * baris agent di bawahnya 0% dan 50%.
       *
       * UNRESOLVED tetap menampilkan rincian status tanpa persentase SLA.
       */
      const departmentSla =
        department !== 'UNRESOLVED' && summary && summary.slaEligible > 0
          ? (summary.slaAchieved / summary.slaEligible) * 100
          : null;
      return {
        department,
        total: summary?.total ?? 0,
        open: summary?.open ?? 0,
        closed: summary?.closed ?? 0,
        slaPercentage:
          departmentSla === null ? null : Math.round(departmentSla * 100) / 100,
        breakdown: agentRows.map((row) => {
          // Angka di balik persentasenya. Jumlahnya adalah tiket valid, bukan
          // seluruh tiket agent — tiket uji coba dan duplikat tidak ikut,
          // jadi inSla + outSla bisa lebih kecil dari total.
          const eligible = row.slaEligible ?? 0;
          const inSla = row.slaAchieved ?? 0;

          return {
            name: row.name!,
            total: row.total,
            open: row.open,
            closed: row.closed,
            inSla,
            openInSla: row.openInSla ?? 0,
            outSla: eligible - inSla,
            slaPercentage:
              eligible > 0
                ? Math.round((inSla / eligible) * 10000) / 100
                : null,
          };
        }),
      };
    });
  }
}
