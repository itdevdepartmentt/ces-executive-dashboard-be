import { Prisma } from '@prisma/client';

/** Apply the current eligibility rule to historical flags without rewriting data. */
export function fcrExpression(
  type: 'kip' | 'realisasi' | undefined,
  source: 'OCA' | 'OMNIX' | 'CALL',
): Prisma.Sql {
  if (type !== 'realisasi') return Prisma.sql`"isFcr"`;
  const status =
    source === 'OCA'
      ? Prisma.sql`"last_status"`
      : source === 'OMNIX'
        ? Prisma.sql`"ticket_status_name"`
        : Prisma.sql`'closed'`;
  const targetEmpty =
    source === 'OCA'
      ? Prisma.sql`COALESCE(BTRIM("eskalasi_realisasi_target"), '') IN ('', '-')
        AND COALESCE(BTRIM("eskalasi_id_remedy_it_ao_ems"), '') IN ('', '-')
        AND COALESCE(BTRIM("id_remedy_no"), '') IN ('', '-')`
      : source === 'OMNIX'
        ? Prisma.sql`COALESCE(BTRIM("ticket_IT/AO"), '') IN ('', '-')
          AND COALESCE(BTRIM("ticket_Remedy_NO"), '') IN ('', '-')`
        : Prisma.sql`TRUE`;
  return Prisma.sql`COALESCE((
    "isFcr" = true AND "isFcrRealisasi" = true
    AND (BTRIM(${status}) ILIKE 'close%' OR BTRIM(${status}) ILIKE 'resolve%')
    AND COALESCE(BTRIM("eskalasi"), '') IN ('', '-')
    AND ${targetEmpty}
  ), false)`;
}
