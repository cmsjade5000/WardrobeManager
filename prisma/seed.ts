import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create some initial tags
  const casualTag = await prisma.tag.upsert({
    where: { name: 'Casual' },
    update: {},
    create: { name: 'Casual' },
  });

  const workTag = await prisma.tag.upsert({
    where: { name: 'Work' },
    update: {},
    create: { name: 'Work' },
  });

  const summerTag = await prisma.tag.upsert({
    where: { name: 'Summer' },
    update: {},
    create: { name: 'Summer' },
  });

  const winterTag = await prisma.tag.upsert({
    where: { name: 'Winter' },
    update: {},
    create: { name: 'Winter' },
  });

  console.log('✅ Seed data created successfully!');
  console.log(`Created tags: ${casualTag.name}, ${workTag.name}, ${summerTag.name}, ${winterTag.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
