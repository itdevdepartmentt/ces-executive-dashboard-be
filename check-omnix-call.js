const { PrismaClient } = require('./node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const omnixCount = await prisma.rawOmnix.count();
  const callCount = await prisma.rawCall.count();
  const ocaCount = await prisma.rawOca.count();

  console.log(`--- Database Row Counts ---`);
  console.log(`RawOca: ${ocaCount}`);
  console.log(`RawOmnix: ${omnixCount}`);
  console.log(`RawCall: ${callCount}`);

  // Let's check Omnix dates
  if (omnixCount > 0) {
    const minMaxOmnix = await prisma.$queryRaw`
      SELECT MIN("date_start_interaction") as min_date, MAX("date_start_interaction") as max_date FROM "RawOmnix"
    `;
    console.log('Omnix Date Range:', minMaxOmnix);
  }

  // Let's check Call dates
  if (callCount > 0) {
    const minMaxCall = await prisma.$queryRaw`
      SELECT MIN("update_stamp") as min_date, MAX("update_stamp") as max_date FROM "RawCall"
    `;
    console.log('Call Date Range:', minMaxCall);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
