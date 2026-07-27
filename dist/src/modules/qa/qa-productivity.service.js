"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QaProductivityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
const agent_matcher_1 = require("../../utils/agent-matcher");
let isRetroactiveUpdateRunning = false;
let QaProductivityService = class QaProductivityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard(month, year, dateStr, user) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        const targetDate = new Date(dateStr);
        const targetDateStart = new Date(targetDate);
        targetDateStart.setHours(0, 0, 0, 0);
        const targetDateEnd = new Date(targetDate);
        targetDateEnd.setHours(23, 59, 59, 999);
        const settings = await this.prisma.qaTargetSetting.findMany();
        const qcTargets = new Map();
        settings.filter(s => s.type === 'QC').forEach(s => qcTargets.set(s.name, s));
        const agentTargets = new Map();
        settings.filter(s => s.type === 'AGENT').forEach(s => {
            const existing = agentTargets.get(s.name);
            if (existing) {
                existing.peak1 += s.peak1 || 0;
                existing.peak2 += s.peak2 || 0;
                existing.peak3 += s.peak3 || 0;
                existing.monthly = Math.max(existing.monthly, s.monthly || 0);
            }
            else {
                agentTargets.set(s.name, { peak1: s.peak1 || 0, peak2: s.peak2 || 0, peak3: s.peak3 || 0, monthly: s.monthly || 0 });
            }
        });
        const monthlyTappings = await this.prisma.qaFormTapping.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                }
            },
            select: {
                id: true,
                tapper: true,
                agent: true,
                peak: true,
                createdAt: true,
                tappingDuration: true,
            }
        });
        const monthlyRekons = await this.prisma.qaReconciliation.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
                status: { in: ['APPROVED', 'REJECTED'] }
            },
            select: {
                qcName: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        const lookupAgents = await this.prisma.lookupAgent.findMany({
            where: { tapper: { not: null } }
        });
        const qcAgentMap = new Map();
        for (const agent of lookupAgents) {
            if (agent.tapper && agent.tapper.trim() !== '' && agent.namaAgent) {
                if (!qcAgentMap.has(agent.tapper)) {
                    qcAgentMap.set(agent.tapper, new Set());
                }
                qcAgentMap.get(agent.tapper).add(agent.namaAgent);
            }
        }
        for (const tapping of monthlyTappings) {
            if (tapping.tapper && tapping.tapper.trim() !== '' && tapping.agent) {
                if (!qcAgentMap.has(tapping.tapper)) {
                    qcAgentMap.set(tapping.tapper, new Set());
                }
                qcAgentMap.get(tapping.tapper).add(tapping.agent);
            }
        }
        const qcUsers = await this.prisma.user.findMany({
            where: {
                role: { in: ['QC', 'TL_QC'] }
            }
        });
        for (const user of qcUsers) {
            if (!qcAgentMap.has(user.name)) {
                qcAgentMap.set(user.name, new Set());
            }
        }
        const qcProductivity = [];
        for (const [tapper, agentSet] of qcAgentMap.entries()) {
            const agents = Array.from(agentSet);
            const qcTarget = qcTargets.get(tapper);
            if (!qcTarget)
                continue;
            const tappings = monthlyTappings.filter(t => t.tapper === tapper);
            const dailyTappings = tappings.filter(t => t.createdAt >= targetDateStart && t.createdAt <= targetDateEnd);
            const p1 = tappings.filter(t => t.peak === 1).length;
            const p2 = tappings.filter(t => t.peak === 2).length;
            const p3 = tappings.filter(t => t.peak === 3).length;
            let totalTapSec = 0;
            let validTaps = 0;
            tappings.forEach(t => {
                if (t.tappingDuration) {
                    totalTapSec += t.tappingDuration;
                    validTaps++;
                }
            });
            const avgTappingDuration = validTaps > 0 ? Math.round(totalTapSec / validTaps) : 0;
            const rekons = monthlyRekons.filter(r => r.qcName === tapper);
            let totalRekonSec = 0;
            let validRekons = 0;
            rekons.forEach(r => {
                if (r.createdAt && r.updatedAt) {
                    totalRekonSec += (r.updatedAt.getTime() - r.createdAt.getTime()) / 1000;
                    validRekons++;
                }
            });
            const avgRekonSla = validRekons > 0 ? Math.round((totalRekonSec / validRekons) / 60) : 0;
            qcProductivity.push({
                tapper,
                totalAgent: agents.length,
                agentNames: agents.join(', '),
                dailyTarget: qcTarget.daily,
                dailyRealization: dailyTappings.length,
                dailyRemaining: qcTarget.daily - dailyTappings.length,
                peak1Target: qcTarget.peak1 || 0,
                peak1Realization: p1,
                peak1Remaining: (qcTarget.peak1 || 0) - p1,
                peak2Target: qcTarget.peak2 || 0,
                peak2Realization: p2,
                peak2Remaining: (qcTarget.peak2 || 0) - p2,
                peak3Target: qcTarget.peak3 || 0,
                peak3Realization: p3,
                peak3Remaining: (qcTarget.peak3 || 0) - p3,
                monthlyTarget: qcTarget.monthly,
                monthlyRealization: tappings.length,
                monthlyRemaining: qcTarget.monthly - tappings.length,
                avgTappingDuration,
                avgRekonSla,
            });
        }
        const agentPerformance = [];
        const allAgentsSet = new Set();
        const lookupMapForDashboard = new Map();
        lookupAgents.forEach(a => {
            if (a.namaAgent) {
                lookupMapForDashboard.set(a.namaAgent.toLowerCase().trim(), a);
                allAgentsSet.add(a.namaAgent);
            }
        });
        monthlyTappings.forEach(t => {
            if (t.agent) {
                const match = (0, agent_matcher_1.findAgentMatch)(t.agent, lookupMapForDashboard);
                if (match && match.namaAgent) {
                    t.agent = match.namaAgent;
                }
                allAgentsSet.add(t.agent);
            }
        });
        const allAgents = Array.from(allAgentsSet);
        const dailyTappings = monthlyTappings.filter(t => t.createdAt >= targetDateStart && t.createdAt <= targetDateEnd);
        for (const agent of allAgents) {
            const aTarget = agentTargets.get(agent) || { peak1: 0, peak2: 0, peak3: 0, monthly: 0 };
            const tappings = monthlyTappings.filter(t => t.agent === agent);
            if (!agentTargets.has(agent)) {
                continue;
            }
            const p1 = tappings.filter(t => t.peak === 1).length;
            const p2 = tappings.filter(t => t.peak === 2).length;
            const p3 = tappings.filter(t => t.peak === 3).length;
            const lookupAgentInfo = lookupAgents.find(a => a.namaAgent === agent);
            const tapperPeaks = new Map();
            tappings.forEach(t => {
                if (t.tapper && t.peak) {
                    if (!tapperPeaks.has(t.tapper)) {
                        tapperPeaks.set(t.tapper, new Set());
                    }
                    tapperPeaks.get(t.tapper).add(t.peak);
                }
            });
            let tapperForAgent = '';
            if (tapperPeaks.size > 0) {
                const labels = [];
                tapperPeaks.forEach((peaks, tapperName) => {
                    const sortedPeaks = Array.from(peaks).sort();
                    const peakStr = sortedPeaks.map(p => `P${p}`).join(', ');
                    labels.push(`${tapperName} (${peakStr})`);
                });
                tapperForAgent = labels.join(' | ');
            }
            else {
                tapperForAgent = lookupAgentInfo?.tapper || 'Unknown Tapper';
            }
            const groupForAgent = lookupAgentInfo?.group || '';
            agentPerformance.push({
                agent,
                tapper: tapperForAgent,
                group: groupForAgent,
                peak1Target: aTarget.peak1 || 0,
                peak1Realization: p1,
                peak1Remaining: (aTarget.peak1 || 0) - p1,
                peak2Target: aTarget.peak2 || 0,
                peak2Realization: p2,
                peak2Remaining: (aTarget.peak2 || 0) - p2,
                peak3Target: aTarget.peak3 || 0,
                peak3Realization: p3,
                peak3Remaining: (aTarget.peak3 || 0) - p3,
                monthlyTarget: aTarget.monthly,
                monthlyRealization: tappings.length,
                monthlyRemaining: aTarget.monthly - tappings.length,
            });
        }
        qcProductivity.sort((a, b) => a.tapper.localeCompare(b.tapper));
        agentPerformance.sort((a, b) => a.agent.localeCompare(b.agent));
        let filteredQcProductivity = qcProductivity;
        let filteredAgentPerformance = agentPerformance;
        let totalEksekutor = 0;
        let totalChat = 0;
        let totalCallCenter = 0;
        let totalBillco = 0;
        let totalEmailGs = 0;
        let totalLainnya = 0;
        const allLookupAgents = await this.prisma.lookupAgent.findMany();
        const agentGroupMap = new Map();
        allLookupAgents.forEach(a => { if (a.namaAgent)
            agentGroupMap.set(a.namaAgent.toLowerCase().trim(), a); });
        const filteredDailyTappings = (user && user.role === 'QC')
            ? dailyTappings.filter(t => t.tapper === user.name)
            : dailyTappings;
        for (const t of filteredDailyTappings) {
            if (!t.agent)
                continue;
            const lookup = (0, agent_matcher_1.findAgentMatch)(t.agent, agentGroupMap);
            const group = (lookup && lookup.group) ? lookup.group.toUpperCase() : '';
            if (group.includes('EKSEKUTOR')) {
                totalEksekutor++;
            }
            else if (group.includes('CHAT')) {
                totalChat++;
            }
            else if (group.includes('CALL CENTER') || group === 'CC') {
                totalCallCenter++;
            }
            else if (group.includes('BILLCO')) {
                totalBillco++;
            }
            else if (group.includes('EMAIL GS') || group.includes('EMAIL')) {
                totalEmailGs++;
            }
            else {
                totalLainnya++;
            }
        }
        let totalQcDailyTarget = 0;
        if (user && user.role === 'QC') {
            const qcT = qcTargets.get(user.name);
            totalQcDailyTarget = qcT ? qcT.daily : 0;
        }
        else {
            qcTargets.forEach(t => { totalQcDailyTarget += t.daily; });
        }
        const realtimeOverview = {
            totalEksekutor,
            targetEksekutor: Math.floor(totalQcDailyTarget * 0.8),
            totalChat,
            totalCallCenter,
            totalBillco,
            totalEmailGs,
            totalLainnya,
            totalAll: totalEksekutor + totalChat + totalCallCenter + totalBillco + totalEmailGs + totalLainnya,
            targetAll: totalQcDailyTarget,
        };
        return {
            qcProductivity: filteredQcProductivity,
            agentPerformance: filteredAgentPerformance,
            realtimeOverview
        };
    }
    async getSettings() {
        const settings = await this.prisma.qaTargetSetting.findMany();
        const lookupAgentsAll = await this.prisma.lookupAgent.findMany();
        const tappings = await this.prisma.qaFormTapping.findMany({
            select: { tapper: true, agent: true }
        });
        const allQcs = new Set();
        const allAgents = new Set();
        lookupAgentsAll.forEach(a => {
            if (a.tapper && a.tapper.trim() !== '')
                allQcs.add(a.tapper);
            if (a.namaAgent && a.namaAgent.trim() !== '')
                allAgents.add(a.namaAgent);
        });
        tappings.forEach(t => {
            if (t.tapper && t.tapper.trim() !== '')
                allQcs.add(t.tapper);
        });
        const qcUsers = await this.prisma.user.findMany({
            where: { role: { in: ['QC', 'TL_QC'] } }
        });
        qcUsers.forEach(u => allQcs.add(u.name));
        const uniqueQcs = Array.from(allQcs).sort();
        const qcSettingsMap = new Map(settings.filter(s => s.type === 'QC').map(s => [s.name, s]));
        const agentLookupList = lookupAgentsAll.filter(a => a.namaAgent);
        const agentLookupByName = new Map();
        agentLookupList.forEach(a => {
            const key = a.namaAgent;
            if (!agentLookupByName.has(key))
                agentLookupByName.set(key, []);
            agentLookupByName.get(key).push(a);
        });
        const qcs = uniqueQcs.map(qc => {
            const s = qcSettingsMap.get(qc);
            return {
                name: qc,
                daily: s?.daily || 0,
                peak1: s?.peak1 || 0,
                peak2: s?.peak2 || 0,
                peak3: s?.peak3 || 0,
                monthly: s?.monthly || 0,
            };
        });
        const agentSettingRows = settings.filter(s => s.type === 'AGENT');
        const agentsWithSettings = new Set(agentSettingRows.map(s => s.name));
        const agentsOnlyInLookup = Array.from(allAgents).filter(a => !agentsWithSettings.has(a));
        const agents = [];
        for (const s of agentSettingRows) {
            const lookupRows = agentLookupByName.get(s.name) || [];
            const matchingLookup = lookupRows.find(l => l.tapper?.trim() === s.tapper?.trim()) || lookupRows[0];
            agents.push({
                name: s.name,
                peak1: s.peak1 || 0,
                peak2: s.peak2 || 0,
                peak3: s.peak3 || 0,
                monthly: s.monthly || 0,
                tapper: s.tapper || matchingLookup?.tapper || '',
                teamLeader: matchingLookup?.teamLeader || '',
                group: matchingLookup?.group || '',
            });
        }
        for (const agName of agentsOnlyInLookup) {
            const lookupRows = agentLookupByName.get(agName) || [];
            for (const l of lookupRows) {
                agents.push({
                    name: agName,
                    peak1: l.peak1 || 0,
                    peak2: l.peak2 || 0,
                    peak3: l.peak3 || 0,
                    monthly: 0,
                    tapper: l.tapper || '',
                    teamLeader: l.teamLeader || '',
                    group: l.group || '',
                });
            }
        }
        agents.sort((a, b) => a.name.localeCompare(b.name));
        return { qcs, agents };
    }
    async saveSettings(data) {
        const { qcs, agents } = data;
        const allLookupAgents = await this.prisma.lookupAgent.findMany();
        const lookupMap = new Map();
        allLookupAgents.forEach(a => { if (a.namaAgent)
            lookupMap.set(a.namaAgent.toLowerCase().trim(), a); });
        const newTargetSettings = [];
        const processedQcs = new Set();
        for (const qc of qcs) {
            if (processedQcs.has(qc.name))
                continue;
            processedQcs.add(qc.name);
            newTargetSettings.push({ name: qc.name, type: 'QC', tapper: '', daily: Number(qc.daily), peak1: Number(qc.peak1), peak2: Number(qc.peak2), peak3: Number(qc.peak3), monthly: Number(qc.monthly) });
        }
        const processedAgentTappers = new Set();
        const lookupUpdates = [];
        const lookupCreates = [];
        const processedLookupAgentNames = new Set();
        for (const ag of agents) {
            const existingLookup = (0, agent_matcher_1.findAgentMatch)(ag.name, lookupMap);
            const canonicalName = existingLookup ? existingLookup.namaAgent : ag.name;
            const tapperKey = (ag.tapper || '').trim();
            const compositeKey = `${canonicalName}|${tapperKey}`;
            if (processedAgentTappers.has(compositeKey))
                continue;
            processedAgentTappers.add(compositeKey);
            const existingForAgent = newTargetSettings.filter(s => s.name === canonicalName && s.type === 'AGENT');
            let hasConflict = false;
            for (const existing of existingForAgent) {
                const conflict = (Number(ag.peak1) > 0 && existing.peak1 > 0) ||
                    (Number(ag.peak2) > 0 && existing.peak2 > 0) ||
                    (Number(ag.peak3) > 0 && existing.peak3 > 0);
                if (conflict) {
                    hasConflict = true;
                    console.warn(`Peak conflict for agent ${canonicalName}: tapper ${tapperKey} vs ${existing.tapper}`);
                    break;
                }
            }
            if (hasConflict)
                continue;
            newTargetSettings.push({
                name: canonicalName,
                type: 'AGENT',
                tapper: tapperKey,
                peak1: Number(ag.peak1) || 0,
                peak2: Number(ag.peak2) || 0,
                peak3: Number(ag.peak3) || 0,
                monthly: Number(ag.monthly) || 0,
                daily: 0
            });
            if (ag.tapper || ag.teamLeader || ag.group) {
                const existingForTapper = allLookupAgents.find(a => a.namaAgent?.toLowerCase().trim() === canonicalName.toLowerCase().trim() &&
                    a.tapper?.toLowerCase().trim() === tapperKey.toLowerCase().trim());
                if (existingForTapper) {
                    lookupUpdates.push({
                        id: existingForTapper.id,
                        data: { tapper: tapperKey, teamLeader: ag.teamLeader, group: ag.group, peak1: Number(ag.peak1) || 0, peak2: Number(ag.peak2) || 0, peak3: Number(ag.peak3) || 0 }
                    });
                }
                else if (!processedLookupAgentNames.has(canonicalName + '|' + tapperKey)) {
                    if (existingLookup && !processedLookupAgentNames.has(canonicalName + '|__any')) {
                        lookupUpdates.push({
                            id: existingLookup.id,
                            data: { tapper: tapperKey, teamLeader: ag.teamLeader, group: ag.group, peak1: Number(ag.peak1) || 0, peak2: Number(ag.peak2) || 0, peak3: Number(ag.peak3) || 0 }
                        });
                        processedLookupAgentNames.add(canonicalName + '|__any');
                    }
                    else {
                        lookupCreates.push({
                            namaAgent: canonicalName,
                            tapper: tapperKey,
                            teamLeader: ag.teamLeader || '',
                            group: ag.group || '',
                            peak1: Number(ag.peak1) || 0,
                            peak2: Number(ag.peak2) || 0,
                            peak3: Number(ag.peak3) || 0,
                        });
                    }
                    processedLookupAgentNames.add(canonicalName + '|' + tapperKey);
                }
            }
        }
        await this.prisma.qaTargetSetting.deleteMany();
        if (newTargetSettings.length > 0) {
            await this.prisma.qaTargetSetting.createMany({ data: newTargetSettings });
        }
        const allCanonicalNames = new Set(agents.map(ag => {
            const el = (0, agent_matcher_1.findAgentMatch)(ag.name, lookupMap);
            return el ? el.namaAgent : ag.name;
        }));
        if (allCanonicalNames.size > 0) {
            await this.prisma.lookupAgent.deleteMany({
                where: { namaAgent: { notIn: Array.from(allCanonicalNames) } }
            });
        }
        if (lookupCreates.length > 0) {
            await this.prisma.lookupAgent.createMany({ data: lookupCreates });
        }
        for (let i = 0; i < lookupUpdates.length; i++) {
            await this.prisma.lookupAgent.update({
                where: { id: lookupUpdates[i].id },
                data: lookupUpdates[i].data
            });
            if (i % 10 === 0)
                await new Promise(r => setTimeout(r, 10));
        }
        this.retroactivelyUpdateTickets().catch(err => console.error('Error during retroactive update:', err));
        return { success: true };
    }
    async bulkDeleteSettings(agentNames, type = 'AGENT') {
        if (!agentNames || agentNames.length === 0)
            return { success: true };
        await this.prisma.qaTargetSetting.deleteMany({
            where: {
                name: { in: agentNames },
                type: type,
            }
        });
        return { success: true };
    }
    async retroactivelyUpdateTickets() {
        if (isRetroactiveUpdateRunning) {
            console.log('Retroactive update is already running, skipping to prevent DB pool starvation...');
            return;
        }
        isRetroactiveUpdateRunning = true;
        console.log('Running automatic retroactive update for TL and Tapper...');
        try {
            const lookupAgents = await this.prisma.lookupAgent.findMany();
            const agentMap = new Map();
            for (const agent of lookupAgents) {
                if (agent.namaAgent) {
                    agentMap.set(agent.namaAgent.toLowerCase().trim(), agent);
                }
            }
            const allTappings = await this.prisma.qaFormTapping.findMany({
                where: { OR: [{ teamLeader: '' }, { tapper: '' }] },
                select: { id: true, agent: true, tapper: true, teamLeader: true }
            });
            let tappingsUpdateCount = 0;
            for (const t of allTappings) {
                if (!t.agent)
                    continue;
                const lookup = (0, agent_matcher_1.findAgentMatch)(t.agent, agentMap);
                if (lookup) {
                    const needsUpdate = (lookup.teamLeader && t.teamLeader !== lookup.teamLeader) ||
                        (lookup.tapper && t.tapper !== lookup.tapper);
                    if (needsUpdate) {
                        await this.prisma.qaFormTapping.update({
                            where: { id: t.id },
                            data: { teamLeader: lookup.teamLeader || t.teamLeader, tapper: lookup.tapper || t.tapper }
                        });
                        tappingsUpdateCount++;
                        if (tappingsUpdateCount % 10 === 0)
                            await new Promise(r => setTimeout(r, 20));
                    }
                }
            }
            const allTickets = await this.prisma.qaTicket.findMany({
                where: { OR: [{ teamLeader: '' }, { tapper: '' }] },
                select: { id: true, agent: true, tapper: true, teamLeader: true }
            });
            let updateCount = 0;
            for (const t of allTickets) {
                if (!t.agent)
                    continue;
                const lookup = (0, agent_matcher_1.findAgentMatch)(t.agent, agentMap);
                if (lookup) {
                    const needsUpdate = (lookup.teamLeader && t.teamLeader !== lookup.teamLeader) ||
                        (lookup.tapper && t.tapper !== lookup.tapper);
                    if (needsUpdate) {
                        await this.prisma.qaTicket.update({
                            where: { id: t.id },
                            data: { teamLeader: lookup.teamLeader || t.teamLeader, tapper: lookup.tapper || t.tapper }
                        });
                        updateCount++;
                        if (updateCount % 10 === 0)
                            await new Promise(r => setTimeout(r, 20));
                    }
                }
            }
            console.log('Automatic retroactive update complete.');
        }
        finally {
            isRetroactiveUpdateRunning = false;
        }
    }
    async parseExcelSettings(file) {
        try {
            if (!file)
                throw new common_1.BadRequestException('File is required');
            const workbook = new ExcelJS.Workbook();
            try {
                await workbook.xlsx.load(file.buffer);
            }
            catch (err) {
                console.error('Excel parse error:', err);
                throw new common_1.BadRequestException('Failed to parse Excel file: ' + err.message);
            }
            const ws = workbook.worksheets[0];
            const parsedAgents = [];
            const parsedQcs = [];
            const conflictWarnings = [];
            ws.eachRow((row, rowNumber) => {
                if (rowNumber > 2) {
                    const agentName = row.getCell(2).value || row.getCell(8).value;
                    const qcName = row.getCell(7).value;
                    const group = row.getCell(3).value;
                    const teamLeader = row.getCell(6).value;
                    const peak1 = Number(row.getCell(10).value) || 0;
                    const peak2 = Number(row.getCell(11).value) || 0;
                    const peak3 = Number(row.getCell(12).value) || 0;
                    const daily = row.getCell(9).value;
                    const tapperName = qcName ? qcName.toString().trim() : '';
                    if (agentName) {
                        const newEntry = {
                            name: agentName.toString().trim(),
                            group: group ? group.toString().trim() : '',
                            teamLeader: teamLeader ? teamLeader.toString().trim() : '',
                            tapper: tapperName,
                            peak1,
                            peak2,
                            peak3,
                        };
                        const existingForAgent = parsedAgents.filter(a => a.name === newEntry.name);
                        if (existingForAgent.length === 0) {
                            parsedAgents.push(newEntry);
                        }
                        else {
                            const sameTapper = existingForAgent.find(a => a.tapper === newEntry.tapper);
                            if (sameTapper) {
                            }
                            else {
                                let hasConflict = false;
                                for (const existing of existingForAgent) {
                                    const conflict = (peak1 > 0 && existing.peak1 > 0) ||
                                        (peak2 > 0 && existing.peak2 > 0) ||
                                        (peak3 > 0 && existing.peak3 > 0);
                                    if (conflict) {
                                        hasConflict = true;
                                        conflictWarnings.push(`Konflik peak untuk agent "${newEntry.name}": tapper "${newEntry.tapper}" vs "${existing.tapper}" memiliki nilai peak yang tumpang tindih.`);
                                        break;
                                    }
                                }
                                if (!hasConflict) {
                                    parsedAgents.push(newEntry);
                                }
                            }
                        }
                    }
                    if (qcName && daily !== null && daily !== undefined) {
                        parsedQcs.push({
                            name: qcName.toString().trim(),
                            daily: Number(daily) || 0,
                        });
                    }
                }
            });
            const uniqueQcs = Array.from(new Map(parsedQcs.map(item => [item.name, item])).values());
            return { parsedAgents, parsedQcs: uniqueQcs, conflictWarnings };
        }
        catch (err) {
            console.error('parseExcelSettings crashed:', err);
            throw new common_1.BadRequestException(`Excel parsing failed: ${err.message}\nStack: ${err.stack}`);
        }
    }
};
exports.QaProductivityService = QaProductivityService;
exports.QaProductivityService = QaProductivityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QaProductivityService);
//# sourceMappingURL=qa-productivity.service.js.map