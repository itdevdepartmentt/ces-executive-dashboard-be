import { Prisma } from '@prisma/client';
import { fcrExpression } from './fcr-expression';

type Source = 'OCA' | 'OMNIX' | 'CALL';

/** Closed tickets retain recorded SLA; unfinished tickets are evaluated now. */
export function currentSlaExpression(source: Source): Prisma.Sql {
  if (source === 'CALL') return Prisma.sql`COALESCE("inSla", false)`;
  const status =
    source === 'OCA'
      ? Prisma.sql`"last_status"`
      : Prisma.sql`"ticket_status_name"`;
  const created =
    source === 'OCA'
      ? Prisma.sql`"ticket_created"`
      : Prisma.sql`"date_start_interaction"`;
  return Prisma.sql`CASE
    WHEN COALESCE(BTRIM(${status}) ILIKE 'close%' OR BTRIM(${status}) ILIKE 'resolve%', false)
      THEN COALESCE("inSla", false)
    WHEN ${created} IS NULL OR ${created} > NOW() THEN false
    WHEN UPPER(BTRIM(COALESCE(product, ''))) = 'CONNECTIVITY'
      THEN NOW() - ${created} <= interval '3 hours'
    WHEN UPPER(BTRIM(COALESCE(product, ''))) = 'SOLUTION'
      THEN NOW() - ${created} <= interval '6 hours'
    ELSE false
  END`;
}

/**
 * Populasi SLA di dashboard FCR mengikuti tab yang dipilih: tab KIP memakai
 * seluruh tiket valid FCR berdasarkan KIP, tab Realisasi hanya yang lolos
 * realisasi (tanpa eskalasi).
 *
 * Sebelumnya populasinya selalu realisasi apa pun tabnya. Karena realisasi
 * adalah bagian dari KIP, kedua tab berakhir menghitung SLA dari himpunan
 * yang sama, sehingga angkanya identik sampai dua desimal padahal jumlah
 * tiket yang ditampilkan berbeda.
 */
export function slaEligibilityExpression(
  isFcr: boolean | undefined,
  source: Source,
  fcrType: 'kip' | 'realisasi' | undefined,
): Prisma.Sql {
  return isFcr === true
    ? Prisma.sql`("statusTiket" AND ${fcrExpression(fcrType, source)})`
    : Prisma.sql`"statusTiket"`;
}
