// Quick setup script to create test library and librarian for semantic search testing
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTestData() {
  console.log('🏗️ Creating test library and librarian...');

  try {
    // Create library
    const library = await prisma.library.create({
      data: {
        name: 'Semantic Search Test Library',
        description: 'Library for testing semantic search functionality',
        location: 'Test Location'
      }
    });

    console.log(`✅ Library created: ${library.name} (${library.id})`);

    // Create librarian
    const librarian = await prisma.librarian.create({
      data: {
        name: 'Test Librarian',
        contactInfo: 'test@example.com',
        isSuper: true,
        secretKey: 'test-key-123',
        libraryId: library.id
      }
    });

    console.log(`✅ Librarian created: ${librarian.name} (${librarian.id})`);

    console.log('\n🎯 Ready for book seeding:');
    console.log(`node scripts/seed-books.js ${library.id} ${librarian.id}`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();
