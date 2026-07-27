const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const name = 'SWAZY NILLA HENDRASSWARI';
  const user = await prisma.user.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  console.log('User found:', user);

  if (user) {
    const res = await prisma.appNotification.create({
      data: {
        recipientId: user.id,
        type: 'QA_TAPPING_TL',
        title: 'Test TL Notification',
        message: 'This is a test notification for the TL',
      }
    });
    console.log('Created Notification:', res);
  }
}

main().finally(() => prisma.$disconnect());
