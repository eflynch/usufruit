import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function updateExistingLibrarians() {
  console.log('🔑 Updating existing librarians with secret keys...');

  try {
    // Get all librarians without secret keys
    const librariansWithoutKeys = await prisma.librarian.findMany({
      where: {
        secretKey: null,
      },
    });

    console.log(`Found ${librariansWithoutKeys.length} librarians without secret keys`);

    for (const librarian of librariansWithoutKeys) {
      const secretKey = randomBytes(32).toString('hex');
      
      await prisma.librarian.update({
        where: { id: librarian.id },
        data: { secretKey },
      });

      console.log(`✅ Updated librarian ${librarian.name} with secret key`);
    }

    console.log('🎉 All librarians now have secret keys!');
  } catch (error) {
    console.error('❌ Error updating librarians:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingLibrarians().then(() => process.exit(0));
