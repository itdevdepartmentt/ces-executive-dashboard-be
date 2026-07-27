"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIP_REGEX = void 0;
exports.createLookupMap = createLookupMap;
exports.classifyTicket = classifyTicket;
exports.determineChannel = determineChannel;
const rules_constant_1 = require("./rules.constant");
exports.VIP_REGEX = /vvip|vip|direk|director|komisaris/i;
async function createLookupMap(modelDelegate, keyField, valueField) {
    const data = await modelDelegate.findMany({
        select: {
            [keyField]: true,
            [valueField]: true,
        },
    });
    const lookupMap = new Map();
    for (const row of data) {
        const rawKey = row[keyField];
        const value = row[valueField];
        if (rawKey && typeof rawKey === 'string') {
            lookupMap.set(rawKey.trim().toLowerCase(), value || '');
        }
    }
    return lookupMap;
}
function classifyTicket(row) {
    for (const rule of rules_constant_1.TICKET_RULES) {
        const cellValue = row[rule.prop];
        if (cellValue && rule.check(cellValue)) {
            return {
                status: rule.status,
                isValid: false,
                reason: `Matched ${rule.status} rule on ${rule.prop}`,
            };
        }
    }
    if (/Livechat/i.test(row['channelOca'] || '') &&
        /Eskalasi BES/i.test(row['description'] || '')) {
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
function determineChannel(row, agentMap) {
    const department = row.department || '';
    const channel = row.channelOca || '';
    const agentName = row.assignee || row.reporter || '';
    const agentGroup = agentMap.get(agentName.trim().toLowerCase());
    if (/cc/i.test(agentGroup || '')) {
        return 'callcenter';
    }
    if (/#CCCorp/i.test(row.ticketSubject || '')) {
        return 'callcenter';
    }
    if (/leads/i.test(department)) {
        return 'leads';
    }
    else if (/survey/i.test(department)) {
        return 'survey';
    }
    if (/email|form/i.test(channel) &&
        /^Live Chat|TL QC/.test(department)) {
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
    if (/GENERAL SERVICE FIX|TECHNICAL TEAM|BUFFER 2024|QC|ENGINEER/i.test(department)) {
        return 'email';
    }
    else if (/Live chat|BES LIVE CHAT|Messenger/i.test(department)) {
        return 'livechat';
    }
    if (/live chat/i.test(agentGroup || '')) {
        return 'livechat';
    }
    return channel;
}
//# sourceMappingURL=oca-ticket.utils.js.map