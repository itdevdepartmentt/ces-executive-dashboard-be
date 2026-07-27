const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tappings = await prisma.qaFormTapping.findMany({
    where: { agent: 'ADNAN FARIS HARIS' },
    select: { id: true, peak: true, tapper: true, agent: true }
  });
  console.log('Tappings for Adnan:', tappings.length);
  if (tappings.length > 0) {
    console.log(tappings.slice(0, 5));
  }
}
run();
