import { Prisma } from '@prisma/client';

/**
 * Apply the current eligibility rule to historical flags without rewriting data.
 *
 * Status tiket tidak lagi diperiksa: realisasi kini mencakup tiket yang masih
 * berjalan, bukan hanya yang sudah Closed/Resolved. Perhatikan bahwa ekspresi
 * ini meng-AND dengan kolom "isFcrRealisasi" yang tersimpan, jadi ia hanya
 * bisa mempersempit hasil — melonggarkan aturan di sini saja tidak cukup,
 * kolom tersimpannya juga harus dihitung ulang untuk data lama.
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
    "isFcr" = true AND "isFcrRealisasi" = true
    AND COALESCE(BTRIM("eskalasi"), '') IN ('', '-')
    AND ${targetEmpty}
  ), false)`;
}
