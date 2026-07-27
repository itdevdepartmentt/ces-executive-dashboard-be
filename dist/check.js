"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tappings = await prisma.qaFormTapping.findMany({ select: { id: true, agent: true, tapper: true } });
    console.log('Tappings:', JSON.stringify(tappings, null, 2));
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=check.js.map