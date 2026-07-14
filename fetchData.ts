import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT 
        ROW_NUMBER() OVER (ORDER BY waktu_aksi DESC) AS "No",
        "Nama Artikel",
        "User",
        "Action (CRUD)",
        TO_CHAR(waktu_aksi, 'DD/MM/YYYY HH24:MI:SS') AS "dd/mm/yyyy hh:mm:ss"
    FROM (
        SELECT 
            n.title AS "Nama Artikel",
            n."authorName" AS "User",
            'CREATE' AS "Action (CRUD)",
            n."createdAt" AS waktu_aksi
        FROM "News" n
        WHERE n.title ILIKE '%bisa%' 
          AND n."createdAt" >= '2026-04-01 00:00:00'
          AND n."createdAt" <= '2026-07-08 23:59:59'
        
        UNION ALL
        
        SELECT 
            n.title AS "Nama Artikel",
            n."authorName" AS "User",
            'LAST UPDATE' AS "Action (CRUD)",
            n."updatedAt" AS waktu_aksi
        FROM "News" n
        WHERE n.title ILIKE '%bisa%' 
          AND n."updatedAt" >= '2026-04-01 00:00:00'
          AND n."updatedAt" <= '2026-07-08 23:59:59'
          AND n."updatedAt" > n."createdAt"
    ) data_gabungan
    ORDER BY waktu_aksi DESC;
  `;
  
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
