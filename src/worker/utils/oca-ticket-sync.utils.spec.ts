import {
  shouldProcessOcaTicket,
  StoredOcaTicketSnapshot,
} from './oca-ticket-sync.utils';

describe('OCA ticket synchronization', () => {
  const time = '2026-11-11T03:03:14.000Z';
  const source = {
    updated_at: time,
    status: 'open',
    department_data: { name: 'FCR' },
    assigned_data: { name: 'Agent A' },
  };
  const stored: StoredOcaTicketSnapshot = {
    ticket_number: 'TICKET-2626769',
    last_update: new Date(time),
    last_status: 'Open',
    department: 'FCR',
    assignee: 'Agent A',
  };

  it('processes new tickets and tickets with no stored timestamp', () => {
    expect(shouldProcessOcaTicket(source)).toBe(true);
    expect(
      shouldProcessOcaTicket(source, { ...stored, last_update: null }),
    ).toBe(true);
  });
  it('processes a newer timestamp even when snapshot fields are unchanged', () => {
    expect(
      shouldProcessOcaTicket(
        { ...source, updated_at: '2026-11-11T04:00:00Z' },
        stored,
      ),
    ).toBe(true);
  });
  it('updates Open to Closed even when OCA leaves updated_at unchanged', () => {
    expect(
      shouldProcessOcaTicket({ ...source, status: 'closed' }, stored),
    ).toBe(true);
  });
  it('detects department and agent changes without a timestamp change', () => {
    expect(
      shouldProcessOcaTicket(
        { ...source, department_data: { name: 'Tiket Unresolved' } },
        stored,
      ),
    ).toBe(true);
    expect(
      shouldProcessOcaTicket(
        { ...source, assigned_data: { name: 'Agent B' } },
        stored,
      ),
    ).toBe(true);
  });
  it('skips identical snapshots regardless of whitespace or casing', () => {
    expect(
      shouldProcessOcaTicket(
        { ...source, status: ' OPEN ', department_data: { name: ' fcr ' } },
        stored,
      ),
    ).toBe(false);
  });
  it('does not overwrite newer stored data with an older API snapshot', () => {
    expect(
      shouldProcessOcaTicket(
        { ...source, updated_at: '2026-11-10T03:03:14Z', status: 'closed' },
        stored,
      ),
    ).toBe(false);
  });
  it('does not treat an omitted assignee as an agent change', () => {
    expect(
      shouldProcessOcaTicket({ ...source, assigned_data: null }, stored),
    ).toBe(false);
  });
  it('does not overwrite a valid stored timestamp with an invalid source timestamp', () => {
    expect(
      shouldProcessOcaTicket({ ...source, updated_at: 'invalid' }, stored),
    ).toBe(false);
  });
});
