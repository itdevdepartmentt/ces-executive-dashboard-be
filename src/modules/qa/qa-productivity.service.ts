import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { findAgentMatch } from '../../utils/agent-matcher';

let isRetroactiveUpdateRunning = false;

@Injectable()
export class QaProductivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(month: number, year: number, dateStr: string, user?: any) {
    // Determine date range for month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Determine target day
    const targetDate = new Date(dateStr);
    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);

    // Get QC and Agent targets
    const settings = await this.prisma.qaTargetSetting.findMany();
    // Map of QC targets
    const qcTargets = new Map<string, any>();
    settings.filter(s => s.type === 'QC').forEach(s => qcTargets.set(s.name, s));
    
    // Map of Agent targets
    const agentTargets = new Map<string, any>();
    settings.filter(s => s.type === 'AGENT').forEach(s => agentTargets.set(s.name, s));

    // Get Form Tappings for the month
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

    // Get Reconciliations for the month to calculate SLA
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

    // Get agent mapping (to group by Tapper)
    // First, try from LookupAgent
    const lookupAgents = await this.prisma.lookupAgent.findMany({
      where: { tapper: { not: null } }
    });

    const qcAgentMap = new Map<string, Set<string>>();
    
    // Add from LookupAgent
    for (const agent of lookupAgents) {
      if (agent.tapper && agent.tapper.trim() !== '' && agent.namaAgent) {
        if (!qcAgentMap.has(agent.tapper)) {
          qcAgentMap.set(agent.tapper, new Set());
        }
        qcAgentMap.get(agent.tapper)!.add(agent.namaAgent);
      }
    }

    // Add from actual Tapping data (in case LookupAgent is incomplete)
    for (const tapping of monthlyTappings) {
      if (tapping.tapper && tapping.tapper.trim() !== '' && tapping.agent) {
        if (!qcAgentMap.has(tapping.tapper)) {
          qcAgentMap.set(tapping.tapper, new Set());
        }
        qcAgentMap.get(tapping.tapper)!.add(tapping.agent);
      }
    }

    // Add all users with QC or TL_QC roles so they appear even if they have no agents/tappings
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

    // Build QC Productivity
    const qcProductivity: any[] = [];
    for (const [tapper, agentSet] of qcAgentMap.entries()) {
      const agents = Array.from(agentSet);
      const qcTarget = qcTargets.get(tapper);
      if (!qcTarget) continue; // Only show QCs that have a defined target
      
      const tappings = monthlyTappings.filter(t => t.tapper === tapper);
      const dailyTappings = tappings.filter(t => t.createdAt >= targetDateStart && t.createdAt <= targetDateEnd);

      const p1 = tappings.filter(t => t.peak === 1).length;
      const p2 = tappings.filter(t => t.peak === 2).length;
      const p3 = tappings.filter(t => t.peak === 3).length;

      // Calculate avgTappingDuration
      let totalTapSec = 0;
      let validTaps = 0;
      tappings.forEach(t => {
        if (t.tappingDuration) {
          totalTapSec += t.tappingDuration;
          validTaps++;
        }
      });
      const avgTappingDuration = validTaps > 0 ? Math.round(totalTapSec / validTaps) : 0;

      // Calculate avgRekonSla (in hours or minutes)
      const rekons = monthlyRekons.filter(r => r.qcName === tapper);
      let totalRekonSec = 0;
      let validRekons = 0;
      rekons.forEach(r => {
        if (r.createdAt && r.updatedAt) {
          totalRekonSec += (r.updatedAt.getTime() - r.createdAt.getTime()) / 1000;
          validRekons++;
        }
      });
      // Return SLA in minutes
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

    // Build Agent Performance
    const agentPerformance: any[] = [];
    
    // Get all unique agents from both sources
    const allAgentsSet = new Set<string>();
    
    // Create a map of lookup agents for smart matching
    const lookupMapForDashboard = new Map<string, any>();
    lookupAgents.forEach(a => {
      if (a.namaAgent) {
        lookupMapForDashboard.set(a.namaAgent.toLowerCase().trim(), a);
        allAgentsSet.add(a.namaAgent);
      }
    });

    // Normalize tappings to canonical lookup names if there is a smart match
    monthlyTappings.forEach(t => { 
      if (t.agent) {
        const match = findAgentMatch(t.agent, lookupMapForDashboard);
        if (match && match.namaAgent) {
          t.agent = match.namaAgent; // override with canonical name
        }
        allAgentsSet.add(t.agent);
      }
    });
    
    const allAgents = Array.from(allAgentsSet);
    
    const dailyTappings = monthlyTappings.filter(t => t.createdAt >= targetDateStart && t.createdAt <= targetDateEnd);
    
    for (const agent of allAgents) {
      const aTarget = agentTargets.get(agent) || { peak1: 0, peak2: 0, peak3: 0, monthly: 0 } as any;
      const tappings = monthlyTappings.filter(t => t.agent === agent);
      
      // Only show agents that have a defined target (exist in the uploaded Excel file)
      if (!agentTargets.has(agent)) {
         continue; 
      }
      
      const p1 = tappings.filter(t => t.peak === 1).length;
      const p2 = tappings.filter(t => t.peak === 2).length;
      const p3 = tappings.filter(t => t.peak === 3).length;

      // Find the tapper and group for this agent from either tapping data or lookup
      const lookupAgentInfo = lookupAgents.find(a => a.namaAgent === agent);
      
      const tapperPeaks = new Map<string, Set<number>>();
      tappings.forEach(t => {
        if (t.tapper && t.peak) {
          if (!tapperPeaks.has(t.tapper)) {
            tapperPeaks.set(t.tapper, new Set());
          }
          tapperPeaks.get(t.tapper)!.add(t.peak);
        }
      });
      
      let tapperForAgent = '';
      if (tapperPeaks.size > 0) {
        const labels: string[] = [];
        tapperPeaks.forEach((peaks, tapperName) => {
          const sortedPeaks = Array.from(peaks).sort();
          const peakStr = sortedPeaks.map(p => `P${p}`).join(', ');
          labels.push(`${tapperName} (${peakStr})`);
        });
        tapperForAgent = labels.join(' | ');
      } else {
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

    // Sort qcProductivity and agentPerformance
    qcProductivity.sort((a, b) => a.tapper.localeCompare(b.tapper));
    agentPerformance.sort((a, b) => a.agent.localeCompare(b.agent));

    // Tables will show ALL data regardless of role, as requested by user
    let filteredQcProductivity = qcProductivity;
    let filteredAgentPerformance = agentPerformance;

    // Realtime overview (Split by channel)
    let totalEksekutor = 0;
    let totalChat = 0;
    let totalCallCenter = 0;
    let totalBillco = 0;
    let totalEmailGs = 0;
    let totalLainnya = 0;
    
    // Fetch all lookup agents to properly check group
    const allLookupAgents = await this.prisma.lookupAgent.findMany();
    const agentGroupMap = new Map<string, any>();
    allLookupAgents.forEach(a => { if (a.namaAgent) agentGroupMap.set(a.namaAgent.toLowerCase().trim(), a); });

    // Filter dailyTappings for QC
    const filteredDailyTappings = (user && user.role === 'QC')
      ? dailyTappings.filter(t => t.tapper === user.name)
      : dailyTappings;

    for (const t of filteredDailyTappings) {
      if (!t.agent) continue;
      const lookup = findAgentMatch(t.agent, agentGroupMap);
      const group = (lookup && lookup.group) ? lookup.group.toUpperCase() : '';
      
      if (group.includes('EKSEKUTOR')) {
        totalEksekutor++;
      } else if (group.includes('CHAT')) {
        totalChat++;
      } else if (group.includes('CALL CENTER') || group === 'CC') {
        totalCallCenter++;
      } else if (group.includes('BILLCO')) {
        totalBillco++;
      } else if (group.includes('EMAIL GS') || group.includes('EMAIL')) {
        totalEmailGs++;
      } else {
        totalLainnya++;
      }
    }

    let totalQcDailyTarget = 0;
    if (user && user.role === 'QC') {
      const qcT = qcTargets.get(user.name);
      totalQcDailyTarget = qcT ? qcT.daily : 0;
    } else {
      qcTargets.forEach(t => { totalQcDailyTarget += t.daily; });
    }

    const realtimeOverview = {
      totalEksekutor,
      targetEksekutor: Math.floor(totalQcDailyTarget * 0.8), // e.g. 80% as shown in UI
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
    
    // Also fetch distinct QCs and Agents from QaFormTapping so we don't miss any if LookupAgent is empty
    const tappings = await this.prisma.qaFormTapping.findMany({
      select: { tapper: true, agent: true }
    });
    
    const allQcs = new Set<string>();
    const allAgents = new Set<string>();
    
    lookupAgentsAll.forEach(a => {
      if (a.tapper && a.tapper.trim() !== '') allQcs.add(a.tapper);
      if (a.namaAgent && a.namaAgent.trim() !== '') allAgents.add(a.namaAgent);
    });
    
    tappings.forEach(t => {
      if (t.tapper && t.tapper.trim() !== '') allQcs.add(t.tapper);
      // Removed: pulling agents from tappings so old agents disappear if not in lookupAgent
    });
    
    const qcUsers = await this.prisma.user.findMany({
      where: { role: { in: ['QC', 'TL_QC'] } }
    });
    qcUsers.forEach(u => allQcs.add(u.name));
    
    const uniqueQcs = Array.from(allQcs).sort();
    const uniqueAgents = Array.from(allAgents).sort();

    const qcSettingsMap = new Map<string, any>(settings.filter(s => s.type === 'QC').map(s => [s.name, s]));
    const agentSettingsMap = new Map<string, any>(settings.filter(s => s.type === 'AGENT').map(s => [s.name, s]));
    
    // Build lookup map for agent metadata (group, tapper, teamLeader)
    const agentLookupMap = new Map<string, any>(lookupAgentsAll.filter(a => a.namaAgent).map(a => [a.namaAgent!, a]));

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

    const agents = uniqueAgents.map(ag => {
      const s = agentSettingsMap.get(ag) as any;
      const lookup = findAgentMatch(ag, agentLookupMap);
      return {
        name: ag,
        peak1: s?.peak1 || 0,
        peak2: s?.peak2 || 0,
        peak3: s?.peak3 || 0,
        monthly: s?.monthly || 0,
        tapper: lookup?.tapper || '',
        teamLeader: lookup?.teamLeader || '',
        group: lookup?.group || ''
      };
    });

    return { qcs, agents };
  }

  async saveSettings(data: { qcs: any[], agents: any[] }) {
    const { qcs, agents } = data;

    // Fetch existing lookup agents for smart matching
    const allLookupAgents = await this.prisma.lookupAgent.findMany();
    const lookupMap = new Map<string, any>();
    allLookupAgents.forEach(a => { if (a.namaAgent) lookupMap.set(a.namaAgent.toLowerCase().trim(), a); });

    const newTargetSettings: any[] = [];
    const processedQcs = new Set<string>();
    for (const qc of qcs) {
      if (processedQcs.has(qc.name)) continue;
      processedQcs.add(qc.name);
      newTargetSettings.push({ name: qc.name, type: 'QC', daily: Number(qc.daily), peak1: Number(qc.peak1), peak2: Number(qc.peak2), peak3: Number(qc.peak3), monthly: Number(qc.monthly) });
    }

    const processedAgents = new Set<string>();
    const lookupUpdates: any[] = [];
    const lookupCreates: any[] = [];
    
    for (const ag of agents) {
      const existingLookup = findAgentMatch(ag.name, lookupMap);
      const canonicalName = existingLookup ? existingLookup.namaAgent : ag.name;

      if (processedAgents.has(canonicalName)) continue;
      processedAgents.add(canonicalName);

      newTargetSettings.push({ name: canonicalName, type: 'AGENT', peak1: Number(ag.peak1), peak2: Number(ag.peak2), peak3: Number(ag.peak3), monthly: Number(ag.monthly), daily: 0 });

      if (ag.tapper || ag.teamLeader || ag.group) {
        if (existingLookup) {
          lookupUpdates.push({ id: existingLookup.id, data: { tapper: ag.tapper, teamLeader: ag.teamLeader, group: ag.group } });
        } else {
          lookupCreates.push({ namaAgent: ag.name, tapper: ag.tapper, teamLeader: ag.teamLeader, group: ag.group });
        }
      }
    }

    // Now execute them rapidly but sequentially (no transaction) to prevent pool starvation
    await this.prisma.qaTargetSetting.deleteMany();
    if (newTargetSettings.length > 0) {
      await this.prisma.qaTargetSetting.createMany({ data: newTargetSettings });
    }

    if (processedAgents.size > 0) {
      await this.prisma.lookupAgent.deleteMany({
        where: { namaAgent: { notIn: Array.from(processedAgents) } }
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
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 10)); // Yield to pool
    }

    // Run the retroactive update in background so that it doesn't cause an HTTP request timeout
    this.retroactivelyUpdateTickets().catch(err => console.error('Error during retroactive update:', err));
    
    return { success: true };
  }

  async bulkDeleteSettings(agentNames: string[], type: string = 'AGENT') {
    if (!agentNames || agentNames.length === 0) return { success: true };
    await this.prisma.qaTargetSetting.deleteMany({
      where: {
        name: { in: agentNames },
        type: type,
      }
    });
    return { success: true };
  }

  private async retroactivelyUpdateTickets() {
    if (isRetroactiveUpdateRunning) {
      console.log('Retroactive update is already running, skipping to prevent DB pool starvation...');
      return;
    }
    isRetroactiveUpdateRunning = true;
    console.log('Running automatic retroactive update for TL and Tapper...');
    
    try {
      const lookupAgents = await this.prisma.lookupAgent.findMany();
      
      const agentMap = new Map<string, any>();
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
      if (!t.agent) continue;
      const lookup = findAgentMatch(t.agent, agentMap);
      if (lookup) {
        const needsUpdate = (lookup.teamLeader && t.teamLeader !== lookup.teamLeader) || 
                            (lookup.tapper && t.tapper !== lookup.tapper);
        if (needsUpdate) {
          await this.prisma.qaFormTapping.update({
            where: { id: t.id },
            data: { teamLeader: lookup.teamLeader || t.teamLeader, tapper: lookup.tapper || t.tapper }
          });
          tappingsUpdateCount++;
          if (tappingsUpdateCount % 10 === 0) await new Promise(r => setTimeout(r, 20)); // Yield to DB pool
        }
      }
    }

    const allTickets = await this.prisma.qaTicket.findMany({
      where: { OR: [{ teamLeader: '' }, { tapper: '' }] },
      select: { id: true, agent: true, tapper: true, teamLeader: true }
    });

    let updateCount = 0;
    for (const t of allTickets) {
      if (!t.agent) continue;
      const lookup = findAgentMatch(t.agent, agentMap);
      if (lookup) {
        const needsUpdate = (lookup.teamLeader && t.teamLeader !== lookup.teamLeader) || 
                            (lookup.tapper && t.tapper !== lookup.tapper);
        if (needsUpdate) {
          await this.prisma.qaTicket.update({
            where: { id: t.id },
            data: { teamLeader: lookup.teamLeader || t.teamLeader, tapper: lookup.tapper || t.tapper }
          });
          updateCount++;
          if (updateCount % 10 === 0) await new Promise(r => setTimeout(r, 20)); // Yield to DB pool
        }
      }
    }
    console.log('Automatic retroactive update complete.');
    } finally {
      isRetroactiveUpdateRunning = false;
    }
  }

  async parseExcelSettings(file: Express.Multer.File) {
    try {
      if (!file) throw new BadRequestException('File is required');
    
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(file.buffer as any);
    } catch (err) {
      console.error('Excel parse error:', err);
      throw new BadRequestException('Failed to parse Excel file: ' + err.message);
    }
    const ws = workbook.worksheets[0];
    
    const parsedAgents: any[] = [];
    const parsedQcs: any[] = [];
    
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 2) { // Skip headers
        // Columns (1-indexed based on exceljs)
        // 1: NO, 2: NAMA AGENT, 3: GROUPING, 4: LOS, 5: GENDER, 6: TEAM LEADER, 7: TAPPER, 8: NAMA OCA, 9: Jumlah Sample, 10: Peak 1, 11: Peak 2, 12: Peak 3
        const agentName = row.getCell(2).value || row.getCell(8).value; // Prefer NAMA AGENT (Col 2), fallback to NAMA OCA (Col 8)
        const qcName = row.getCell(7).value; // TAPPER (Col 7)
        
        const group = row.getCell(3).value; // GROUPING (Col 3)
        const teamLeader = row.getCell(6).value; // TEAM LEADER (Col 6)
        
        const peak1 = row.getCell(10).value; // Peak 1 (Col 10)
        const peak2 = row.getCell(11).value; // Peak 2 (Col 11)
        const peak3 = row.getCell(12).value; // Peak 3 (Col 12)
        const daily = row.getCell(9).value; // Jumlah Sample (Col 9)
        
        if (agentName) {
          parsedAgents.push({
            name: agentName.toString().trim(),
            group: group ? group.toString().trim() : '',
            teamLeader: teamLeader ? teamLeader.toString().trim() : '',
            tapper: qcName ? qcName.toString().trim() : '',
            peak1: Number(peak1) || 0,
            peak2: Number(peak2) || 0,
            peak3: Number(peak3) || 0,
          });
        }
        
        if (qcName && daily !== null && daily !== undefined) {
          parsedQcs.push({
            name: qcName.toString().trim(),
            daily: Number(daily) || 0,
          });
        }
      }
    });
    
    // Deduplicate QCs in case multiple agents have the same QC
    const uniqueQcs = Array.from(new Map(parsedQcs.map(item => [item.name, item])).values());
    
    return { parsedAgents, parsedQcs: uniqueQcs };
    } catch (err) {
      console.error('parseExcelSettings crashed:', err);
      throw new BadRequestException(`Excel parsing failed: ${err.message}\nStack: ${err.stack}`);
    }
  }
}
