import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Akun uji untuk setiap peran, dipakai memverifikasi batasan akses.
 *
 * Password-nya lemah dan sengaja seragam agar mudah dipakai saat pengembangan,
 * karena itu skrip ini menolak berjalan di production.
 */
const TEST_USERS: { name: string; email: string; role: UserRole }[] = [
  { name: 'Admin', email: 'admin@cesia.com', role: 'ADMIN' },
  { name: 'QC Tester', email: 'qc@cesia.com', role: 'QC' },
  { name: 'TL Tester', email: 'tl@cesia.com', role: 'TL' },
  { name: 'TL QC Tester', email: 'tlqc@cesia.com', role: 'TL_QC' },
  { name: 'User Tester', email: 'user@cesia.com', role: 'USER' },
];

const PASSWORD = process.env.SEED_TEST_PASSWORD ?? 'test1234';

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_SEED !== 'true') {
    throw new Error(
      'Skrip ini membuat akun dengan password lemah dan tidak boleh dijalankan di production. ' +
        'Setel ALLOW_TEST_SEED=true hanya bila kamu benar-benar bermaksud melakukannya.',
    );
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const user of TEST_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      skipped.push(`${user.email} (${existing.role})`);
      continue;
    }
    await prisma.user.create({ data: { ...user, passwordHash } });
    created.push(`${user.email} (${user.role})`);
  }

  console.log(`Dibuat  : ${created.length ? created.join(', ') : '-'}`);
  console.log(`Dilewati: ${skipped.length ? skipped.join(', ') : '-'}`);
  console.log(
    `\nPassword untuk akun yang baru dibuat ada di SEED_TEST_PASSWORD, ` +
      `atau nilai default bila env itu tidak diset.`,
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
