import { Prisma } from '@prisma/client';
import { DepartmentDashboardService } from './department-dashboard.service';

describe('department dashboard', () => {
  function setup(rows: object[] = []) {
    const query = jest
      .fn<Promise<object[]>, [Prisma.Sql]>()
      .mockResolvedValue(rows);
    const service = new DepartmentDashboardService({
      $queryRaw: query,
    } as unknown as ConstructorParameters<
      typeof DepartmentDashboardService
    >[0]);
    return { service, query };
  }

  it('returns all departments with zero totals when no tickets match', async () => {
    const { service } = setup();
    expect(await service.getSummary({})).toEqual(
      ['FCR', 'NON FCR', 'UNRESOLVED'].map((department) => ({
        department,
        total: 0,
        open: 0,
        closed: 0,
        breakdown: [],
      })),
    );
  });

  it('keeps department totals separate from agent and unresolved status rows', async () => {
    const { service } = setup([
      { department: 'FCR', name: null, total: 3, open: 1, closed: 2 },
      { department: 'FCR', name: 'Agent A', total: 2 },
      { department: 'FCR', name: 'Belum ditugaskan', total: 1 },
      { department: 'NON FCR', name: null, total: 1, open: 1, closed: 0 },
      { department: 'NON FCR', name: 'Agent B', total: 1 },
      { department: 'UNRESOLVED', name: null, total: 2, open: 2, closed: 0 },
      { department: 'UNRESOLVED', name: 'Eskalasi IT', total: 2 },
    ]);
    const result = await service.getSummary({
      isFcr: true,
      fcrType: 'realisasi',
    });
    expect(result[0]).toEqual({
      department: 'FCR',
      total: 3,
      open: 1,
      closed: 2,
      breakdown: [
        { name: 'Agent A', total: 2 },
        { name: 'Belum ditugaskan', total: 1 },
      ],
    });
    expect(result[1].total).toBe(1);
    expect(result[2].breakdown).toEqual([{ name: 'Eskalasi IT', total: 2 }]);
  });

  it('counts distinct business ticket IDs and binds filters without an FCR flag filter', async () => {
    const { service, query } = setup();
    await service.getSummary({
      startDate: '2026-11-08T17:00:00Z',
      endDate: '2026-11-09T17:00:00Z',
      categories: ["Customer's request"],
      subCategories: ['Sub'],
      detailCategories: ['Detail'],
      isFcr: true,
      fcrType: 'realisasi',
    });
    const sql = query.mock.calls[0][0];
    expect(sql.sql).toContain('COUNT(DISTINCT ticket_id)');
    expect(sql.sql).toContain("department = 'TIKET UNRESOLVED'");
    expect(sql.sql).toContain('ticket_created >= ?::timestamptz');
    expect(sql.sql).toContain('ticket_created < ?::timestamptz');
    expect(sql.sql).not.toContain('isFcr');
    expect(sql.sql).not.toContain('statusTiket');
    expect(sql.sql).not.toContain("Customer's request");
    expect(sql.values).toEqual([
      '2026-11-08T17:00:00Z',
      '2026-11-09T17:00:00Z',
      "Customer's request",
      'Sub',
      'Detail',
    ]);
  });
});
