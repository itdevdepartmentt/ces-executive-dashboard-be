const { PrismaClient } = require('./node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT pg_get_viewdef('UnifiedTickets', true) AS definition;
  `;
  console.log('--- UnifiedTickets View Definition ---');
  console.log(result[0].definition);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
