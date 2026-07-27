const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestTapping = await prisma.qaFormTapping.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!latestTapping) {
    console.log("No tappings found");
    return;
  }

  console.log('--- Latest Tapping ---');
  console.log('ID:', latestTapping.id);
  console.log('Created At:', latestTapping.createdAt.toISOString());
  console.log('Agent:', latestTapping.agent);
  console.log('Team Leader:', latestTapping.teamLeader);
  console.log('Score Validitas:', latestTapping.scoreValiditas);
}

main().finally(() => prisma.$disconnect());
