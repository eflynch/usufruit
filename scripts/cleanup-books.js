#!/usr/bin/env node

/**
 * Cleanup script to remove seeded books from a library
 * Usage: node scripts/cleanup-books.js <libraryId> [librarianId]
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupBooks(libraryId, librarianId = null) {
  try {
    console.log('🧹 Starting cleanup...');
    
    // Build where condition
    const whereCondition = {
      libraryId: libraryId
    };
    
    if (librarianId) {
      whereCondition.librarianId = librarianId;
    }
    
    // Count books to be deleted
    const bookCount = await prisma.book.count({
      where: whereCondition
    });
    
    if (bookCount === 0) {
      console.log('✅ No books found to delete');
      return;
    }
    
    // Get library info
    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { name: true }
    });
    
    let librarianInfo = '';
    if (librarianId) {
      const librarian = await prisma.librarian.findUnique({
        where: { id: librarianId },
        select: { name: true }
      });
      librarianInfo = librarian ? ` for librarian ${librarian.name}` : '';
    }
    
    console.log(`📚 Found ${bookCount} books in ${library?.name || 'library'}${librarianInfo}`);
    
    // Confirm deletion
    console.log('⚠️  This will permanently delete these books and all associated loans!');
    
    // In a real script, you might want to add readline for confirmation
    // For now, we'll just proceed (you can add confirmation if needed)
    
    // First delete associated loans
    const loanDeleteResult = await prisma.loan.deleteMany({
      where: {
        book: whereCondition
      }
    });
    
    console.log(`🗑️  Deleted ${loanDeleteResult.count} associated loans`);
    
    // Then delete books
    const bookDeleteResult = await prisma.book.deleteMany({
      where: whereCondition
    });
    
    console.log(`✅ Successfully deleted ${bookDeleteResult.count} books`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
🧹 Book Cleanup Script

Usage: node scripts/cleanup-books.js <libraryId> [librarianId]

Arguments:
  libraryId    - ID of the library to clean up
  librarianId  - (Optional) Only delete books for this specific librarian

Examples:
  node scripts/cleanup-books.js lib-123
  node scripts/cleanup-books.js lib-123 librarian-456

⚠️  WARNING: This will permanently delete books and their loan history!
    `);
    process.exit(1);
  }
  
  const libraryId = args[0];
  const librarianId = args[1] || null;
  
  await cleanupBooks(libraryId, librarianId);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanupBooks };
