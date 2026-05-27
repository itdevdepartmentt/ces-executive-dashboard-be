const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const article = await prisma.news.findUnique({
    where: { id: 'cmpdp1v270000dkkgux0th00j' }
  });
  if (!article) {
    console.log('Article not found!');
    return;
  }
  console.log('Title:', article.title);
  console.log('JSON Content:');
  console.log(JSON.stringify(article.content, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
