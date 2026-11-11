import { fcrExpression } from './fcr-expression';

describe('dashboard FCR selection', () => {
  it.each(['OCA', 'OMNIX', 'CALL'] as const)(
    'keeps KIP selection unchanged for %s',
    (source) => {
      expect(fcrExpression('kip', source).sql).toBe('"isFcr"');
    },
  );
  it.each(['OCA', 'OMNIX', 'CALL'] as const)(
    'enforces the subset and escalation rules for historical %s records',
    (source) => {
      const sql = fcrExpression('realisasi', source);
      expect(sql.sql).toContain('"isFcr" = true');
      expect(sql.sql).not.toContain('isFcrRealisasi');
      expect(sql.sql).toContain('BTRIM("eskalasi")');
      expect(sql.sql).not.toContain('inSla');
      expect(sql.values).toEqual([]);

      // Tiket yang masih berjalan ikut dihitung realisasi, jadi status tidak
      // lagi disaring di sini.
      expect(sql.sql).not.toContain("ILIKE 'close%'");
      expect(sql.sql).not.toContain("ILIKE 'resolve%'");
    },
  );
});
