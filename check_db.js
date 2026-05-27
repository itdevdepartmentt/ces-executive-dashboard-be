const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const news = await prisma.news.findMany({
    where: { deletedAt: null }
  });
  console.log(`Found ${news.length} news items:`);
  for (const item of news) {
    console.log('---');
    console.log(`ID: ${item.id}`);
    console.log(`Title: ${item.title}`);
    console.log(`Author: ${item.authorName}`);
    console.log(`SearchText: ${item.searchText ? item.searchText.substring(0, 300) : null}`);
    console.log(`Content JSON Sample: ${JSON.stringify(item.content).substring(0, 300)}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
