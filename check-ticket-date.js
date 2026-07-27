const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tapping = await prisma.qaFormTapping.findUnique({
    where: { id: '585e699d-8be2-44af-8d87-1b7a964f692d' }
  });

  if (!tapping) return;

  const ticket = await prisma.qaTicket.findFirst({
    where: { idTiket: tapping.idTiket }
  });

  console.log('Ticket ID:', ticket.idTiket);
  console.log('createdTicket (field):', ticket.createdTicket);
  console.log('createdAt (field):', ticket.createdAt);
}

main().finally(() => prisma.$disconnect());
