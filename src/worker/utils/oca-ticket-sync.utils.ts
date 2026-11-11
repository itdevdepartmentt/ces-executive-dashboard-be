export interface StoredOcaTicketSnapshot {
  ticket_number: string;
  last_update: Date | null;
  last_status: string | null;
  department: string | null;
  assignee: string | null;
}

interface OcaTicketSnapshot {
  updated_at?: string;
  status?: string | null;
  department_data?: { name?: string | null } | null;
  assigned_data?: { name?: string | null } | null;
}

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

/** OCA can change a ticket's status without advancing updated_at. */
export function shouldProcessOcaTicket(
  source: OcaTicketSnapshot,
  stored?: StoredOcaTicketSnapshot,
): boolean {
  if (!stored?.last_update) return true;
  const sourceTime = new Date(source.updated_at ?? '').getTime();
  const storedTime = stored.last_update.getTime();
  if (!Number.isFinite(sourceTime) || sourceTime < storedTime) return false;
  if (sourceTime > storedTime) return true;

  return (
    normalize(source.status) !== normalize(stored.last_status) ||
    normalize(source.department_data?.name ?? '-') !==
      normalize(stored.department) ||
    // When OCA omits the assignee, the processor derives it from activity history.
    (Boolean(source.assigned_data?.name) &&
      normalize(source.assigned_data?.name) !== normalize(stored.assignee))
  );
}
