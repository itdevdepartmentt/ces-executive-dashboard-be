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
      const qcTarget = qcTargets.get(tapper) || { daily: 0, peak1: 0, peak2: 0, peak3: 0, monthly: 0 } as any;
      
      const tappings = monthlyTappings.filter(t => t.tapper === tapper);
      const dailyTappings = tappings.filter(t => t.createdAt >= targetDateStart && t.createdAt <= targetDateEnd);

      const p1 = tappings.filter(t => t.peak === 1).length;
      const p2 = tappings.filter(t => t.peak === 2).length;
      const p3 = tappings.filter(t => t.peak === 3).length;

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
      
      // Skip agents with 0 tappings if they are not specifically targeted to avoid clutter?
      // Actually, let's include them if they have tappings or if they exist in mapping
      if (tappings.length === 0 && !agentTargets.has(agent)) {
         continue; // Only show agents that have either tapping activity or a defined target
      }
      
      const p1 = tappings.filter(t => t.peak === 1).length;
      const p2 = tappings.filter(t => t.peak === 2).length;
      const p3 = tappings.filter(t => t.peak === 3).length;

      // Find the tapper and group for this agent from either tapping data or lookup
      const lookupAgentInfo = lookupAgents.find(a => a.namaAgent === agent);
      const tapperForAgent = tappings.find(t => t.tapper)?.tapper || lookupAgentInfo?.tapper || 'Unknown Tapper';
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

    // Role-based filtering: QC only sees their own data
    let filteredQcProductivity = qcProductivity;
    let filteredAgentPerformance = agentPerformance;

    if (user && user.role === 'QC') {
      // QC can only see their own productivity
      filteredQcProductivity = qcProductivity.filter(qc => qc.tapper === user.name);
      // QC can only see agents assigned to them
      const ownAgentNames = new Set<string>();
      filteredQcProductivity.forEach(qc => {
        qc.agentNames.split(', ').forEach((name: string) => {
          if (name.trim()) ownAgentNames.add(name.trim());
        });
      });
      filteredAgentPerformance = agentPerformance.filter(ap => ownAgentNames.has(ap.agent));
    }
    // TL_QC and ADMIN see all data (no filter needed)

    // Realtime overview (Split between Eksekutor and All Channel/KIP)
    let totalEksekutor = 0;
    let totalAll = 0;
    
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
      if (lookup && lookup.group && lookup.group.toLowerCase().includes('eksekutor')) {
        totalEksekutor++;
      } else {
        totalAll++;
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
      totalEksekutor: totalEksekutor,
      targetEksekutor: Math.floor(totalQcDailyTarget * 0.8), // e.g. 80% as shown in UI
      totalAll: totalAll,
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

    const newTargetSettings = [];
    const processedQcs = new Set<string>();
    for (const qc of qcs) {
      if (processedQcs.has(qc.name)) continue;
      processedQcs.add(qc.name);
      newTargetSettings.push({ name: qc.name, type: 'QC', daily: Number(qc.daily), peak1: Number(qc.peak1), peak2: Number(qc.peak2), peak3: Number(qc.peak3), monthly: Number(qc.monthly) });
    }

    const processedAgents = new Set<string>();
    const lookupUpdates = [];
    const lookupCreates = [];
    
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

  async bulkDeleteSettings(agentNames: string[]) {
    if (!agentNames || agentNames.length === 0) return { success: true };
    await this.prisma.qaTargetSetting.deleteMany({
      where: {
        name: { in: agentNames },
        type: 'AGENT',
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
