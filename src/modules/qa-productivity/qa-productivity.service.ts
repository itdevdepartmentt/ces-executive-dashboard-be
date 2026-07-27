import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns';

@Injectable()
export class QaProductivityService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.qaTargetSetting.findMany();
    const settingsMap = new Map();
    settings.forEach(s => settingsMap.set(`${s.type}_${s.name}`, s));

    const qcs = await this.prisma.qaFormTapping.findMany({
      select: { tapper: true },
      distinct: ['tapper']
    });

    const agents = await this.prisma.qaFormTapping.findMany({
      select: { agent: true },
      distinct: ['agent']
    });

    const result = {
      qcs: [] as any[],
      agents: [] as any[]
    };

    const uniqueQcs = new Set(qcs.map(q => q.tapper).filter(t => t && t.trim() !== ''));
    const uniqueAgents = new Set(agents.map(a => a.agent).filter(a => a && a.trim() !== ''));

    settings.forEach(s => {
      if (s.type === 'QC') uniqueQcs.add(s.name);
      if (s.type === 'AGENT') uniqueAgents.add(s.name);
    });

    uniqueQcs.forEach(name => {
      const existing = settingsMap.get(`QC_${name}`);
      if (existing) {
        result.qcs.push(existing);
      } else {
        result.qcs.push({ name, type: 'QC', daily: 0, peak1: 0, peak2: 0, peak3: 0, monthly: 0 });
      }
    });

    uniqueAgents.forEach(name => {
      const existing = settingsMap.get(`AGENT_${name}`);
      if (existing) {
        result.agents.push(existing);
      } else {
        result.agents.push({ name, type: 'AGENT', daily: 0, peak1: 0, peak2: 0, peak3: 0, monthly: 0 });
      }
    });

    return result;
  }

  async updateSettings(data: { qcs: any[], agents: any[] }) {
    return this.prisma.$transaction(async (prisma) => {
      const allData = [...(data.qcs || []), ...(data.agents || [])];
      
      for (const item of allData) {
        if (!item.name) continue;
        const tapper = item.tapper || '';
        await prisma.qaTargetSetting.upsert({
          where: { name_type_tapper: { name: item.name, type: item.type, tapper } },
          update: { daily: Number(item.daily) || 0, peak1: Number(item.peak1) || 0, peak2: Number(item.peak2) || 0, peak3: Number(item.peak3) || 0, monthly: Number(item.monthly) || 0 },
          create: { name: item.name, type: item.type, tapper, daily: Number(item.daily) || 0, peak1: Number(item.peak1) || 0, peak2: Number(item.peak2) || 0, peak3: Number(item.peak3) || 0, monthly: Number(item.monthly) || 0 }
        });
      }
      return { success: true };
    });
  }

  async getDashboardData(month: number, year: number, dateStr: string) {
    const settings = await this.prisma.qaTargetSetting.findMany();
    const qcSettingsMap = new Map(settings.filter(s => s.type === 'QC').map(s => [s.name, s]));
    const agentSettingsMap = new Map(settings.filter(s => s.type === 'AGENT').map(s => [s.name, s]));

    const targetDate = parseISO(dateStr);
    const startOfTargetMonth = startOfMonth(new Date(year, month - 1));
    const endOfTargetMonth = endOfMonth(new Date(year, month - 1));
    const startOfTargetDay = startOfDay(targetDate);
    const endOfTargetDay = endOfDay(targetDate);

    const monthlyForms = await this.prisma.qaFormTapping.findMany({
      where: {
        createdAt: {
          gte: startOfTargetMonth,
          lte: endOfTargetMonth,
        },
      },
      select: {
        id: true,
        tapper: true,
        agent: true,
        createdAt: true,
        createdDate: true,
        peak: true,
      },
    });
    
    const qcMap = new Map<string, {
      tapper: string;
      agentsTapped: Set<string>;
      dailyCount: number;
      monthlyCount: number;
      peakCounts: Record<number, number>;
    }>();

    const agentMap = new Map<string, {
      agent: string;
      monthlyCount: number;
      peakCounts: Record<number, number>;
    }>();

    let totalEksekutor = 0;
    let totalAll = 0;

    for (const form of monthlyForms) {
      const isEksekutor = isSameDay(form.createdAt, form.createdDate);
      const isToday = form.createdAt >= startOfTargetDay && form.createdAt <= endOfTargetDay;
      
      if (isToday) {
        totalAll++;
        if (isEksekutor) totalEksekutor++;
      }

      if (form.tapper) {
        if (!qcMap.has(form.tapper)) {
          qcMap.set(form.tapper, {
            tapper: form.tapper,
            agentsTapped: new Set(),
            dailyCount: 0,
            monthlyCount: 0,
            peakCounts: { 1: 0, 2: 0, 3: 0 },
          });
        }
        const qcStat = qcMap.get(form.tapper)!;
        qcStat.agentsTapped.add(form.agent);
        qcStat.monthlyCount++;
        
        if (isToday) {
          qcStat.dailyCount++;
        }
        
        if (form.peak && qcStat.peakCounts[form.peak] !== undefined) {
          qcStat.peakCounts[form.peak]++;
        }
      }

      if (form.agent) {
        if (!agentMap.has(form.agent)) {
          agentMap.set(form.agent, {
            agent: form.agent,
            monthlyCount: 0,
            peakCounts: { 1: 0, 2: 0, 3: 0 },
          });
        }
        const agStat = agentMap.get(form.agent)!;
        agStat.monthlyCount++;
        if (form.peak && agStat.peakCounts[form.peak] !== undefined) {
          agStat.peakCounts[form.peak]++;
        }
      }
    }

    const qcProductivity = Array.from(qcMap.values()).map(qc => {
      const target = qcSettingsMap.get(qc.tapper) || { daily: 0, peak1: 0, peak2: 0, peak3: 0, monthly: 0 };
      return {
        tapper: qc.tapper,
        totalAgent: qc.agentsTapped.size,
        agentNames: Array.from(qc.agentsTapped).join(', '),
        
        dailyTarget: target.daily,
        dailyRealization: qc.dailyCount,
        dailyRemaining: Math.max(0, target.daily - qc.dailyCount),

        monthlyTarget: target.monthly,
        monthlyRealization: qc.monthlyCount,
        monthlyRemaining: Math.max(0, target.monthly - qc.monthlyCount),

        peak1Target: target.peak1 || 0,
        peak1Realization: qc.peakCounts[1] || 0,
        peak1Remaining: Math.max(0, (target.peak1 || 0) - (qc.peakCounts[1] || 0)),

        peak2Target: target.peak2 || 0,
        peak2Realization: qc.peakCounts[2] || 0,
        peak2Remaining: Math.max(0, (target.peak2 || 0) - (qc.peakCounts[2] || 0)),

        peak3Target: target.peak3 || 0,
        peak3Realization: qc.peakCounts[3] || 0,
        peak3Remaining: Math.max(0, (target.peak3 || 0) - (qc.peakCounts[3] || 0)),
      };
    });

    const agentPerformance = Array.from(agentMap.values()).map(ag => {
      const target = agentSettingsMap.get(ag.agent) || { peak1: 0, peak2: 0, peak3: 0, monthly: 0 };
      return {
        agent: ag.agent,
        monthlyTarget: target.monthly,
        monthlyRealization: ag.monthlyCount,
        monthlyRemaining: Math.max(0, target.monthly - ag.monthlyCount),

        peak1Target: target.peak1 || 0,
        peak1Realization: ag.peakCounts[1] || 0,
        peak1Remaining: Math.max(0, (target.peak1 || 0) - (ag.peakCounts[1] || 0)),

        peak2Target: target.peak2 || 0,
        peak2Realization: ag.peakCounts[2] || 0,
        peak2Remaining: Math.max(0, (target.peak2 || 0) - (ag.peakCounts[2] || 0)),

        peak3Target: target.peak3 || 0,
        peak3Realization: ag.peakCounts[3] || 0,
        peak3Remaining: Math.max(0, (target.peak3 || 0) - (ag.peakCounts[3] || 0)),
      };
    });

    let globalDailyTarget = 0;
    for (const qc of qcProductivity) {
      globalDailyTarget += qc.dailyTarget;
    }

    return {
      settings: Array.from(qcSettingsMap.values()).concat(Array.from(agentSettingsMap.values())), // legacy support
      qcProductivity,
      agentPerformance,
      realtimeOverview: {
        totalAll,
        totalEksekutor,
        targetAll: globalDailyTarget,
        targetEksekutor: globalDailyTarget,
      }
    };
  }
}
