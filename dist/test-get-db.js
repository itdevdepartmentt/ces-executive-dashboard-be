"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const agent_matcher_1 = require("./src/utils/agent-matcher");
const prisma = new client_1.PrismaClient();
async function main() {
    const qcs = await prisma.qaTargetSetting.findMany({ where: { type: 'QC' } });
    const agentTargets = await prisma.qaTargetSetting.findMany({ where: { type: 'AGENT' } });
    const lookupAgents = await prisma.lookupAgent.findMany();
    const lookupMap = new Map();
    lookupAgents.forEach(a => { if (a.namaAgent)
        lookupMap.set(a.namaAgent.toLowerCase().trim(), a); });
    const agents = agentTargets.map(at => {
        const lookup = lookupAgents.find(la => la.namaAgent && (0, agent_matcher_1.isSmartMatch)(la.namaAgent, at.name));
        return {
            ...at,
            tapper: lookup?.tapper || '',
            teamLeader: lookup?.teamLeader || '',
            group: lookup?.group || '',
        };
    });
    console.log('Success! Agents:', agents.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=test-get-db.js.map