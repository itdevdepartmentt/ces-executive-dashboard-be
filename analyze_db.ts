import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const newsActivityCount = await prisma.newsActivity.count();
  console.log('Total news_activity:', newsActivityCount);

  if (newsActivityCount > 0) {
    const sampleActivities = await prisma.newsActivity.findMany({ take: 5 });
    console.log('Sample news_activity:', sampleActivities);
  }

  const newsBisaCount = await prisma.news.count({
    where: {
      title: {
        contains: 'bisa',
        mode: 'insensitive'
      }
    }
  });
  console.log('Total News containing BISA in title:', newsBisaCount);

  const newsBisaCatCount = await prisma.news.count({
    where: {
      category: {
        contains: 'bisa',
        mode: 'insensitive'
      }
    }
  });
  console.log('Total News containing BISA in category:', newsBisaCatCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
