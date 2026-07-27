"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting uppercase update for agents...');
    const qaTickets = await prisma.qaTicket.findMany({
        select: { id: true, agent: true }
    });
    let updatedQaTickets = 0;
    for (const ticket of qaTickets) {
        if (ticket.agent && ticket.agent !== ticket.agent.toUpperCase()) {
            await prisma.qaTicket.update({
                where: { id: ticket.id },
                data: { agent: ticket.agent.toUpperCase() }
            });
            updatedQaTickets++;
        }
    }
    console.log(`Updated ${updatedQaTickets} QaTickets`);
    const qaFormTappings = await prisma.qaFormTapping.findMany({
        select: { id: true, agent: true }
    });
    let updatedQaFormTappings = 0;
    for (const tapping of qaFormTappings) {
        if (tapping.agent && tapping.agent !== tapping.agent.toUpperCase()) {
            await prisma.qaFormTapping.update({
                where: { id: tapping.id },
                data: { agent: tapping.agent.toUpperCase() }
            });
            updatedQaFormTappings++;
        }
    }
    console.log(`Updated ${updatedQaFormTappings} QaFormTappings`);
    const lookupAgents = await prisma.lookupAgent.findMany({
        select: { id: true, namaAgent: true }
    });
    let updatedLookupAgents = 0;
    for (const agent of lookupAgents) {
        if (agent.namaAgent && agent.namaAgent !== agent.namaAgent.toUpperCase()) {
            await prisma.lookupAgent.update({
                where: { id: agent.id },
                data: { namaAgent: agent.namaAgent.toUpperCase() }
            });
            updatedLookupAgents++;
        }
    }
    console.log(`Updated ${updatedLookupAgents} LookupAgents`);
    console.log('Update complete!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=update_agents_uppercase.js.map