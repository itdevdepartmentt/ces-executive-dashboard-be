import { TICKET_RULES } from './rules.constant';

// Shared VIP detection regex
export const VIP_REGEX = /vvip|vip|direk|director|komisaris/i;

/**
 * Generic helper to fetch reference data and create a normalized Map.
 * @param modelDelegate The prisma model (e.g. prisma.lookupKIP)
 * @param keyField The database column to be used as the Map Key (normalized)
 * @param valueField The database column to be used as the Map Value
 */
export async function createLookupMap(
  modelDelegate: any,
  keyField: string,
  valueField: string,
): Promise<Map<string, string>> {
  const data = await modelDelegate.findMany({
    select: {
      [keyField]: true,
      [valueField]: true,
    },
  });

  const lookupMap = new Map<string, string>();

  for (const row of data) {
    const rawKey = row[keyField];
    const value = row[valueField];

    if (rawKey && typeof rawKey === 'string') {
      lookupMap.set(rawKey.trim().toLowerCase(), value || '');
    }
  }

  return lookupMap;
}

/**
 * Classify a ticket based on TICKET_RULES.
 * Expects camelCase properties matching `rule.prop` (e.g. customerEmail, ticketSubject, etc.)
 */
export function classifyTicket(row: any) {
  for (const rule of TICKET_RULES) {
    const cellValue = row[rule.prop];

    if (cellValue && rule.check(cellValue)) {
      return {
        status: rule.status,
        isValid: false,
        reason: `Matched ${rule.status} rule on ${rule.prop}`,
      };
    }
  }

  if (
    /Livechat/i.test(row['channelOca'] || '') &&
    /Eskalasi BES/i.test(row['description'] || '')
  ) {
    return {
      status: 'Double',
      isValid: false,
      reason: 'Eskalasi BES in Live Chat',
    };
  }

  if (row['description'] && /completed by hia/i.test(row['description'])) {
    return { status: 'Valid', isValid: true, reason: 'Completed by HIA' };
  }

  return { status: 'Valid', isValid: true, reason: 'Passed all checks' };
}

/**
 * Determine channel based on department, OCA channel, ticket subject, and agent group.
 * Expects camelCase properties: department, channelOca, ticketSubject, assignee.
 */
export function determineChannel(
  row: {
    department?: string;
    channelOca?: string;
    ticketSubject?: string;
    assignee?: string;
  },
  agentMap: Map<string, string>,
): string {
  const department = row.department || '';
  const channel = row.channelOca || '';

  const agentName = row.assignee || '';
  const agentGroup = agentMap.get(agentName.trim().toLowerCase());

  if (/cc/i.test(agentGroup || '')) {
    return 'callcenter';
  }

  if (/#CCCorp/i.test(row.ticketSubject || '')) {
    return 'callcenter';
  }

  if (/leads/i.test(department)) {
    return 'leads';
  } else if (/survey/i.test(department)) {
    return 'survey';
  } 

  if (
    /email|form/i.test(channel) &&
    /^Live Chat|TL QC/.test(department)
  ) {
    return 'email';
  }

  if (/email|form/i.test(channel) &&
      /live chat/i.test(agentGroup || '')) {
    return 'livechat';
  }

  if (/Live Chat/i.test(department)) {
    return 'livechat';
  }

  if (/livechat/i.test(channel)) {
    return 'livechat';
  }

  if (
    /GENERAL SERVICE FIX|TECHNICAL TEAM|BUFFER 2024|QC|ENGINEER/i.test(department)
  ) {
    return 'email';
  } else if (/Live chat|BES LIVE CHAT|Messenger/i.test(department)) {
    return 'livechat';
  }


  if (/live chat/i.test(agentGroup || '')) {
    return 'livechat';
  }

  return channel;
}
