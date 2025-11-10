import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.pet.deleteMany({});
  await prisma.category.deleteMany({});

  // Create categories
  const dogsCategory = await prisma.category.create({
    data: { name: 'Dogs' },
  });

  const catsCategory = await prisma.category.create({
    data: { name: 'Cats' },
  });

  // Create pets
  await prisma.pet.create({
    data: {
      name: 'Balu',
      status: 'available',
      categoryId: dogsCategory.id,
    },
  });

  await prisma.pet.create({
    data: {
      name: 'Max',
      status: 'available',
      categoryId: dogsCategory.id,
    },
  });

  await prisma.pet.create({
    data: {
      name: 'Whiskers',
      status: 'pending',
      categoryId: catsCategory.id,
    },
  });

  await prisma.pet.create({
    data: {
      name: 'Luna',
      status: 'sold',
      categoryId: catsCategory.id,
    },
  });

  console.log('✅ Seed complete!');
  console.log('📊 Created:');
  console.log('   - 2 categories (Dogs, Cats)');
  console.log('   - 4 pets (2 dogs, 2 cats)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
