#!/usr/bin/env node

/**
 * Helper script to find library and librarian IDs for seeding
 * Usage: node scripts/find-ids.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findIds() {
  try {
    console.log('🔍 Finding libraries and librarians...\n');
    
    const libraries = await prisma.library.findMany({
      include: {
        librarians: {
          select: {
            id: true,
            name: true,
            isSuper: true,
            contactInfo: true
          }
        },
        _count: {
          select: {
            books: true
          }
        }
      }
    });
    
    if (libraries.length === 0) {
      console.log('❌ No libraries found. Create a library first!');
      return;
    }
    
    libraries.forEach((library) => {
      console.log(`📚 Library: ${library.name} (ID: ${library.id})`);
      console.log(`   Location: ${library.location || 'Not specified'}`);
      console.log(`   Current books: ${library._count.books}`);
      console.log(`   Librarians:`);
      
      if (library.librarians.length === 0) {
        console.log(`     ❌ No librarians found for this library`);
      } else {
        library.librarians.forEach((librarian) => {
          const role = librarian.isSuper ? 'Super Librarian' : 'Librarian';
          console.log(`     👤 ${librarian.name} (ID: ${librarian.id}) - ${role}`);
          console.log(`        Contact: ${librarian.contactInfo}`);
        });
      }
      console.log('');
    });
    
    // Show example command
    if (libraries.length > 0 && libraries[0].librarians.length > 0) {
      const exampleLibrary = libraries[0];
      const exampleLibrarian = exampleLibrary.librarians[0];
      
      console.log('💡 Example seed command:');
      console.log(`   node scripts/seed-books.js ${exampleLibrary.id} ${exampleLibrarian.id} 30`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error finding IDs:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  findIds().catch(console.error);
}
