const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const responses = await prisma.surveyResponse.findMany({
    where: { generatedAt: null, ticketId: { not: null } },
  });

  console.log(`Found ${responses.length} responses with null generatedAt`);

  for (const res of responses) {
    if (!res.ticketId) continue;
    
    let generatedAt = null;

    // Search OCA
    const ocaTicket = await prisma.rawOca.findUnique({
      where: { ticketNumber: res.ticketId },
      select: { ticketCreated: true }
    });
    if (ocaTicket && ocaTicket.ticketCreated) {
      generatedAt = ocaTicket.ticketCreated;
    }

    // Search Omnix
    if (!generatedAt) {
      const numTicketId = Number(res.ticketId);
      if (!isNaN(numTicketId) && numTicketId <= 2147483647 && numTicketId >= -2147483648) {
        const omnixTicket = await prisma.rawOmnix.findUnique({
          where: { ticketId: numTicketId },
          select: { createdDate: true }
        });
        if (omnixTicket && omnixTicket.createdDate) {
          generatedAt = omnixTicket.createdDate;
        }
      }
    }

    // Search Call
    if (!generatedAt) {
      const callTicket = await prisma.rawCall.findUnique({
        where: { kipId: res.ticketId },
        select: { updateStamp: true }
      });
      if (callTicket && callTicket.updateStamp) {
        generatedAt = callTicket.updateStamp;
      }
    }

    if (generatedAt) {
      await prisma.surveyResponse.update({
        where: { id: res.id },
        data: { generatedAt: generatedAt }
      });
      console.log(`Updated response ${res.id} ticket ${res.ticketId} with generatedAt ${generatedAt}`);
    } else {
      console.log(`Could not find generatedAt for response ${res.id} ticket ${res.ticketId}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
