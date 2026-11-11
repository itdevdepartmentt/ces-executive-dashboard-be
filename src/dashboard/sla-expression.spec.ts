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
    'uses valid KIP FCR with no escalation for %s, across departments',
    (source) => {
      const sql = slaEligibilityExpression(true, source).sql;
      expect(sql).toContain('"statusTiket"');
      expect(sql).toContain('"isFcr" = true');
      expect(sql).toContain('BTRIM("eskalasi")');
      expect(sql).not.toContain('isFcrRealisasi');
      expect(sql).not.toContain('department');
    },
  );
  it.each([undefined, false])(
    'preserves ordinary dashboard eligibility (%s)',
    (isFcr) => {
      expect(slaEligibilityExpression(isFcr, 'OCA').sql).toBe('"statusTiket"');
    },
  );
});
