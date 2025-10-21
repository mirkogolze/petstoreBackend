import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.category.createMany({
    data: [{ name: 'Dogs' }, { name: 'Cats' }],
    skipDuplicates: true,
  });

  const dogs = await prisma.category.findFirst({ where: { name: 'Dogs' } });

  await prisma.pet.create({
    data: {
      name: 'Balu',
      status: 'available',
      categoryId: dogs?.id,
    },
  });

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
