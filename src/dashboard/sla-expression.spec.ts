import {
  currentSlaExpression,
  slaEligibilityExpression,
} from './sla-expression';

describe('dashboard SLA expressions', () => {
  it.each(['OCA', 'OMNIX'] as const)(
    'evaluates open %s tickets at query time',
    (source) => {
      const sql = currentSlaExpression(source);
      expect(sql.sql).toContain("interval '3 hours'");
      expect(sql.sql).toContain("interval '6 hours'");
      expect(sql.sql).toContain('> NOW() THEN false');
      expect(sql.sql).toContain('THEN COALESCE("inSla", false)');
      expect(sql.values).toEqual([]);
    },
  );
  it('retains recorded SLA for the closed CALL source', () => {
    expect(currentSlaExpression('CALL').sql).toBe('COALESCE("inSla", false)');
  });
  it.each(['OCA', 'OMNIX', 'CALL'] as const)(
    'tab Realisasi: valid KIP FCR tanpa eskalasi untuk %s, lintas departemen',
    (source) => {
      const sql = slaEligibilityExpression(true, source, 'realisasi').sql;
      expect(sql).toContain('"statusTiket"');
      expect(sql).toContain('"isFcr" = true');
      expect(sql).toContain('BTRIM("eskalasi")');
      expect(sql).not.toContain('isFcrRealisasi');
      expect(sql).not.toContain('department');
    },
  );
  it.each(['OCA', 'OMNIX', 'CALL'] as const)(
    'tab KIP: seluruh valid FCR KIP untuk %s, tanpa syarat eskalasi',
    (source) => {
      const sql = slaEligibilityExpression(true, source, 'kip').sql;
      expect(sql).toBe('("statusTiket" AND "isFcr")');
      expect(sql).not.toContain('eskalasi');
    },
  );
  it('membedakan populasi SLA antara tab KIP dan Realisasi', () => {
    // Regresi: dulu populasinya selalu realisasi, sehingga kedua tab
    // menampilkan angka SLA identik walau jumlah tiketnya berbeda.
    for (const source of ['OCA', 'OMNIX', 'CALL'] as const) {
      expect(slaEligibilityExpression(true, source, 'kip').sql).not.toBe(
        slaEligibilityExpression(true, source, 'realisasi').sql,
      );
    }
  });
  it.each([
    [undefined, 'kip'],
    [false, 'kip'],
    [undefined, 'realisasi'],
    [false, 'realisasi'],
  ] as const)(
    'dashboard biasa tidak terpengaruh tab (isFcr=%s, %s)',
    (isFcr, fcrType) => {
      expect(slaEligibilityExpression(isFcr, 'OCA', fcrType).sql).toBe(
        '"statusTiket"',
      );
    },
  );
});
