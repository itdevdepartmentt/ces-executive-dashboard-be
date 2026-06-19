import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up existing survey fields...");
  await prisma.surveyField.deleteMany();

  console.log("Seeding survey fields...");

  // Q1
  const q1 = await prisma.surveyField.create({
    data: {
      label: "Seberapa puas Anda dengan Layanan E-mail Telkomsel Enterprise?\nHow satisfied are you with Telkomsel Enterprise Email?",
      type: "RATING",
      isRequired: true,
      order: 1,
    }
  });

  // Q2
  const q2 = await prisma.surveyField.create({
    data: {
      label: "Apakah kebutuhan atau issue Anda terselesaikan?\nWas your needs or issue resolved?",
      type: "SELECT",
      options: [
        "Ya, langsung terselesaikan dalam 1 kali interaksi (Yes, immediately in 1 interaction)",
        "Ya, setelah beberapa kali interaksi (Yes, after a couple interaction)",
        "Tidak, Issue atau masalah saya masih belum terselesaikan. (No, the issue haven't been resolved)"
      ],
      isRequired: true,
      order: 2,
    }
  });

  // Q3 depends on Q2 == "Tidak..."
  const q3 = await prisma.surveyField.create({
    data: {
      label: "Adakah hal yang harus Kami perbaiki atau tindak lanjuti?\nIs there anything we should improve or follow up on?",
      type: "SELECT",
      options: [
        "Ya, Ada (Yes, There is)",
        "Tidak Ada (No, There isn't)"
      ],
      isRequired: false, // Make it optional or true? Let's make it required if it appears
      order: 3,
      dependsOnFieldId: q2.id,
      dependsOnValue: "Tidak, Issue atau masalah saya masih belum terselesaikan. (No, the issue haven't been resolved)",
    }
  });

  // Q4 depends on Q3 == "Ya, Ada"
  const q4 = await prisma.surveyField.create({
    data: {
      label: "Silahkan mengisi Nomor Laporan Anda yang masih perlu kami tindak lanjuti\nPlease enter your Report Number that still requires our follow-up.",
      type: "TEXT",
      isRequired: false,
      order: 4,
      dependsOnFieldId: q3.id,
      dependsOnValue: "Ya, Ada (Yes, There is)",
    }
  });

  // Q5 depends on Q3 == "Ya, Ada"
  const q5 = await prisma.surveyField.create({
    data: {
      label: "Silahkan mengisi nomor kontak person atau MSISDN Anda jika ada hal yang perlu kami tindak lanjuti\nPlease provide your contact person number or MSISDN should any further follow-up be required",
      type: "TEXT",
      isRequired: false,
      order: 5,
      dependsOnFieldId: q3.id,
      dependsOnValue: "Ya, Ada (Yes, There is)",
    }
  });

  console.log("Survey fields seeded successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
