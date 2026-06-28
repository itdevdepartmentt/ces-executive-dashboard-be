const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.news.findFirst().then(console.log).finally(() => prisma.$disconnect());
