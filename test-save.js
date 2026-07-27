const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const transactions = [];
  transactions.push(prisma.qaTargetSetting.deleteMany());
  
  const allLookupAgents = await prisma.lookupAgent.findMany();
  const lookupMap = new Map();
  allLookupAgents.forEach(a => {
    if (a.namaAgent) lookupMap.set(a.namaAgent.toLowerCase().trim(), a);
  });
  
  const agents = [{ name: 'UNKNOWN TAPPER', peak1: 1, peak2: 1, peak3: 1, monthly: 1 }];
  
  for (const ag of agents) {
    const normalized = ag.name.toLowerCase().trim();
    let canonicalName = ag.name;
    if (lookupMap.has(normalized)) {
      canonicalName = lookupMap.get(normalized).namaAgent;
    } else {
      for (const [knownName, value] of lookupMap.entries()) {
        if (knownName === normalized) {
          canonicalName = value.namaAgent;
          break;
        }
      }
    }
    
    transactions.push(prisma.qaTargetSetting.upsert({
      where: { name_type: { name: canonicalName, type: 'AGENT' } },
      update: { peak1: Number(ag.peak1), peak2: Number(ag.peak2), peak3: Number(ag.peak3), monthly: Number(ag.monthly) },
      create: { name: canonicalName, type: 'AGENT', peak1: Number(ag.peak1), peak2: Number(ag.peak2), peak3: Number(ag.peak3), monthly: Number(ag.monthly), daily: 0 }
    }));
  }
  
  try {
    await prisma.$transaction(transactions);
    console.log('success');
  } catch (e) {
    console.error('TX ERROR', e);
  }
}

main().finally(() => process.exit(0));
