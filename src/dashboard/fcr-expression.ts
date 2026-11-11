import { Prisma } from '@prisma/client';

/**
 * Realisasi uses KIP FCR and current escalation fields, across all statuses.
 * Historical isFcrRealisasi flags can reflect obsolete rules and are not a filter.
 */
export function fcrExpression(
  type: 'kip' | 'realisasi' | undefined,
  source: 'OCA' | 'OMNIX' | 'CALL',
): Prisma.Sql {
  if (type !== 'realisasi') return Prisma.sql`"isFcr"`;
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
    "isFcr" = true
    AND COALESCE(BTRIM("eskalasi"), '') IN ('', '-')
    AND ${targetEmpty}
  ), false)`;
}
