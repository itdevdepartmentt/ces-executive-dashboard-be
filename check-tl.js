const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.qaFormTapping.findMany({orderBy: {createdAt: 'desc'}, take: 1});
  console.log('Latest Tapping:', t[0]);
  if (t[0]) {
    const tl = await prisma.user.findFirst({where: {name: t[0].teamLeader}});
    console.log('TL User:', tl);
  }
}
main().finally(() => prisma.$disconnect());
