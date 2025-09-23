import { DatabaseService } from '@usufruit/database';

async function main() {
  console.log('🌱 Seeding database...');

  // Create a library
  const library = await DatabaseService.createLibrary({
    name: 'Community Library',
    description: 'A distributed community library for book sharing',
    location: 'Everywhere and nowhere',
  });

  console.log('📚 Created library:', library.name);

  // Create a librarian
  const librarian = await DatabaseService.createLibrarian({
    name: 'Alice Johnson',
    contactInfo: 'alice@usufruit.org',
    libraryId: library.id,
  });

  console.log('👤 Created librarian:', librarian.name);

  // Create some books
  const books = await Promise.all([
    DatabaseService.createBook({
      title: 'The Art of Community',
      author: 'Jono Bacon',
      description: 'Building the new age of participation',
      organizingRules: 'Keep on shelf A-C',
      checkInInstructions: 'Check condition and clean if needed',
      libraryId: library.id,
      librarianId: librarian.id,
    }),
    DatabaseService.createBook({
      title: 'Patterns of Software',
      author: 'Richard Gabriel',
      description: 'Tales from the software community',
      organizingRules: 'Programming section',
      checkInInstructions: 'Verify all pages are present',
      libraryId: library.id,
      librarianId: librarian.id,
    }),
  ]);

  console.log('📖 Created books:', books.map(b => b.title).join(', '));

  // Create a loan
  await DatabaseService.createLoan({
    bookId: books[0].id,
    librarianId: librarian.id,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
  });

  console.log('📝 Created loan for:', books[0].title);
  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Import prisma here to avoid circular dependency
    const { prisma } = await import('@usufruit/database');
    await prisma.$disconnect();
  });
