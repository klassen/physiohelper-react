import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestData() {
  console.log('Deleting all exercise sessions...');
  
  const result = await prisma.exerciseSession.deleteMany({});
  
  console.log(`✅ Deleted ${result.count} exercise sessions`);
  
  await prisma.$disconnect();
}

deleteTestData()
  .catch((error) => {
    console.error('Error deleting test data:', error);
    process.exit(1);
  });
