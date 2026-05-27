const { PrismaClient } = require('./node_modules/@prisma/client');

const prisma = new PrismaClient();

const createRegex = (slashSeparatedString) => {
  const pattern = slashSeparatedString
    .split('/')
    .map((s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return new RegExp(pattern, 'i');
};

const rules = [
  {
    name: 'Department = Tiket Take Out',
    check: (row) => row.department === 'Tiket Take Out',
  },
  {
    name: 'Sub Category contains leads',
    check: (row) => /leads/i.test(row.subCategory || ''),
  },
  {
    name: 'Ticket Subject contains ctp',
    check: (row) => /ctp/i.test(row.ticketSubject || ''),
  },
  {
    name: 'Assignee = Tiket Take Out',
    check: (row) => row.assignee === 'Tiket Take Out',
  },
  {
    name: 'Description matches double/dobel ticket/tiket',
    regex: createRegex('out of topic / double ticket / dobel ticket / double tiket / dobel tiket / balikan ems / balasan ems'),
    check: function (row) {
      return this.regex.test(row.description || '');
    }
  },
  {
    name: 'Description matches spam (length < 200)',
    regex: createRegex('spam'),
    check: function (row) {
      const normalized = (row.description || '').trim();
      return this.regex.test(normalized) && normalized.length < 200;
    }
  },
  {
    name: 'Detail Category matches out of topic',
    regex: createRegex('I12-Status ticket / I12-Ticket ID / I11-Interaksi terputus / I12-Out Of Topic / Out Of Topic'),
    check: function (row) {
      return this.regex.test(row.detailCategory || '');
    }
  },
  {
    name: 'Livechat with Eskalasi BES in description',
    check: (row) => /Livechat/i.test(row.channelOca || '') && /Eskalasi BES/i.test(row.description || ''),
  }
];

async function main() {
  const startWib = new Date('2026-05-06T17:00:00.000Z');
  const endWib = new Date('2026-05-07T17:00:00.000Z');
  const channels = ['email', 'livechat', 'whatsapp', 'socmed', 'callcenter'];

  const tickets = await prisma.rawOca.findMany({
    where: {
      ticketCreated: { gte: startWib, lt: endWib },
      channel: { in: channels, mode: 'insensitive' }
    }
  });

  console.log(`Analyzing ${tickets.length} total tickets:`);

  // We want to group by rule and see how many of them are Open vs Closed
  for (const rule of rules) {
    let openCount = 0;
    let closedCount = 0;
    let totalRule = 0;

    for (const t of tickets) {
      if (rule.check(t)) {
        totalRule++;
        const isClosed = t.lastStatus.toLowerCase().startsWith('close') || t.lastStatus.toLowerCase().startsWith('resolve');
        if (isClosed) {
          closedCount++;
        } else {
          openCount++;
        }
      }
    }

    if (totalRule > 0) {
      console.log(`Rule: "${rule.name}" | Total Matched: ${totalRule} | Open: ${openCount} | Closed: ${closedCount}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
