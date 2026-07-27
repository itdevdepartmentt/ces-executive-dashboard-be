const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.lookupAgent.findMany({ where: { namaAgent: { contains: 'KIKI' } } });
  console.log(agents);
}

main().finally(() => prisma.$disconnect());
