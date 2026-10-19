import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@cesia.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin';
  const name = 'Admin';
  const role = 'ADMIN';

  // Password default di atas lemah, jadi skrip ini menolak berjalan di
  // production — sama seperti seed-test-users.ts, dan memakai flag yang sama.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_TEST_SEED !== 'true'
  ) {
    throw new Error(
      'Skrip ini membuat akun dengan password lemah dan tidak boleh dijalankan di production. ' +
        'Setel ALLOW_TEST_SEED=true hanya bila kamu benar-benar bermaksud melakukannya.',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
  });

  console.log('Admin user created successfully:');
  console.log({ email: user.email, role: user.role });
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
