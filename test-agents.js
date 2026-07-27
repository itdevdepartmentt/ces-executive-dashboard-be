const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const agents = await prisma.lookupAgent.findMany({
    select: { namaAgent: true }
  });
  console.log('Total agents in DB:', agents.length);
  const adnan = agents.find(a => a.namaAgent === 'ADNAN FARIS HARIS');
  console.log('Is Adnan in DB?', !!adnan);
}
run();
