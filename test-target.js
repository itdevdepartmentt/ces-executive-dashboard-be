const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const settings = await prisma.qaTargetSetting.findMany({
    where: { name: 'ADNAN FARIS HARIS' }
  });
  console.log('Settings for Adnan:', settings);
}
run();
