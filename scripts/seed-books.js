#!/usr/bin/env node

/**
 * Seed script to add sample books to a library for testing pagination and search
 * Usage: node scripts/seed-books.js <libraryId> <librarianId> [count]
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Sample book data for realistic testing
const sampleBooks = [
  {
    title: "The Repair Cafe Handbook",
    author: "John Hopkins",
    description: "A comprehensive guide to fixing household items and reducing waste through community repair workshops."
  },
  {
    title: "Arduino Projects for Beginners",
    author: "Sarah Chen",
    description: "Step-by-step electronics projects using Arduino microcontrollers, perfect for maker spaces."
  },
  {
    title: "Camping Sleeping Bag Care",
    author: "Mike Outdoor",
    description: "Everything you need to know about maintaining, cleaning, and storing sleeping bags for outdoor adventures."
  },
  {
    title: "Community Garden Planning",
    author: "Lisa Green",
    description: "How to start and maintain a neighborhood garden, from soil preparation to harvest sharing."
  },
  {
    title: "Basic Woodworking Tools",
    author: "Tom Carpenter",
    description: "An introduction to essential woodworking tools and their proper use in workshop environments."
  },
  {
    title: "Sewing Machine Maintenance",
    author: "Anna Stitch",
    description: "Keep your sewing machine running smoothly with regular maintenance and troubleshooting tips."
  },
  {
    title: "Solar Panel Installation Guide",
    author: "David Sun",
    description: "DIY solar panel setup for small homes and community buildings, including safety considerations."
  },
  {
    title: "Bike Repair Manual",
    author: "Carlos Wheel",
    description: "Complete bicycle maintenance and repair guide, from basic tune-ups to complex overhauls."
  },
  {
    title: "3D Printing Basics",
    author: "Rachel Print",
    description: "Introduction to 3D printing technology, materials, and designing printable objects."
  },
  {
    title: "Composting Systems",
    author: "Ben Earth",
    description: "Different approaches to composting organic waste in urban and rural settings."
  },
  {
    title: "Power Tool Safety",
    author: "Safety Sam",
    description: "Essential safety practices when using power tools in workshops and makerspaces."
  },
  {
    title: "Knitting Patterns for Beginners",
    author: "Yarn Mary",
    description: "Easy knitting projects perfect for learning basic stitches and techniques."
  },
  {
    title: "Home Brewing Equipment",
    author: "Brew Pete",
    description: "Guide to beer brewing equipment, from basic setups to advanced fermentation systems."
  },
  {
    title: "Photography Lighting Setup",
    author: "Flash Gordon",
    description: "Studio lighting techniques for portrait and product photography."
  },
  {
    title: "Welding for Beginners",
    author: "Spark Jones",
    description: "Introduction to basic welding techniques and safety in metalworking projects."
  },
  {
    title: "Mushroom Growing Kit",
    author: "Fungi Frank",
    description: "How to cultivate edible mushrooms at home using simple growing kits and materials."
  },
  {
    title: "Electronics Troubleshooting",
    author: "Circuit Sue",
    description: "Diagnosing and fixing common electronic device problems with basic tools."
  },
  {
    title: "Pottery Wheel Techniques",
    author: "Clay Williams",
    description: "Fundamentals of throwing pottery on the wheel, from centering to glazing."
  },
  {
    title: "Tent Repair and Maintenance",
    author: "Patch Michelle",
    description: "Keeping camping tents in good condition with proper cleaning, storage, and repair techniques."
  },
  {
    title: "Ukulele for Everyone",
    author: "Uke Steve",
    description: "Learn to play ukulele with simple chord progressions and popular songs."
  },
  {
    title: "Bread Making Without Electricity",
    author: "Baker Emma",
    description: "Traditional bread baking methods that don't require modern appliances."
  },
  {
    title: "Rain Water Collection",
    author: "Drops Alice",
    description: "Systems for collecting and storing rainwater for garden irrigation and emergency use."
  },
  {
    title: "Skateboard Building",
    author: "Deck Tony",
    description: "How to build custom skateboards from selecting wood to final assembly."
  },
  {
    title: "Beekeeping Starter Guide",
    author: "Honey Beth",
    description: "Introduction to beekeeping, hive management, and honey harvesting for beginners."
  },
  {
    title: "Leather Working Tools",
    author: "Hide Robert",
    description: "Essential tools and techniques for working with leather in craft projects."
  },
  {
    title: "Wind Turbine Models",
    author: "Breeze Kevin",
    description: "Building small-scale wind turbines for educational and demonstration purposes."
  },
  {
    title: "Canning and Preserving",
    author: "Jar Patricia",
    description: "Safe food preservation techniques for fruits, vegetables, and prepared foods."
  },
  {
    title: "Telescope Assembly Guide",
    author: "Star Diana",
    description: "Building amateur telescopes for astronomy observation and astrophotography."
  },
  {
    title: "Soap Making Chemistry",
    author: "Bubble Lisa",
    description: "The science behind soap making, from basic bars to specialty formulations."
  },
  {
    title: "Tiny House Construction",
    author: "Small Paul",
    description: "Planning and building efficient small living spaces with limited resources."
  }
];

async function seedBooks(libraryId, librarianId, count = 20) {
  try {
    console.log(`🌱 Starting to seed ${count} books...`);
    
    // Verify library exists
    const library = await prisma.library.findUnique({
      where: { id: libraryId }
    });
    
    if (!library) {
      throw new Error(`Library with ID ${libraryId} not found`);
    }
    
    console.log(`📚 Library found: ${library.name}`);
    
    // Verify librarian exists and belongs to library
    const librarian = await prisma.librarian.findUnique({
      where: { id: librarianId }
    });
    
    if (!librarian) {
      throw new Error(`Librarian with ID ${librarianId} not found`);
    }
    
    if (librarian.libraryId !== libraryId) {
      throw new Error(`Librarian ${librarianId} does not belong to library ${libraryId}`);
    }
    
    console.log(`👤 Librarian found: ${librarian.name}`);
    
    // Create books
    const booksToCreate = [];
    for (let i = 0; i < count; i++) {
      const bookTemplate = sampleBooks[i % sampleBooks.length];
      const book = {
        title: count > sampleBooks.length ? `${bookTemplate.title} (Copy ${Math.floor(i / sampleBooks.length) + 1})` : bookTemplate.title,
        author: bookTemplate.author,
        description: bookTemplate.description,
        borrowDurationDays: Math.floor(Math.random() * 21) + 7, // 7-28 days
        libraryId,
        librarianId,
        // Add some variety to optional fields
        organizingRules: Math.random() > 0.7 ? "Alphabetical by title in the tools section" : undefined,
        checkOutInstructions: Math.random() > 0.8 ? "Please handle with care and return clean" : undefined,
        checkInInstructions: Math.random() > 0.8 ? "Check for damage before returning to shelf" : undefined,
      };
      booksToCreate.push(book);
    }
    
    // Batch create books
    const createdBooks = await prisma.book.createMany({
      data: booksToCreate
    });
    
    console.log(`✅ Successfully created ${createdBooks.count} books!`);
    console.log(`📖 Books added to library: ${library.name}`);
    console.log(`👥 Assigned to librarian: ${librarian.name}`);
    
    // Show some sample titles
    console.log(`\n📋 Sample titles created:`);
    booksToCreate.slice(0, 5).forEach((book, index) => {
      console.log(`   ${index + 1}. ${book.title} by ${book.author}`);
    });
    
    if (count > 5) {
      console.log(`   ... and ${count - 5} more books`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding books:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
📚 Book Seeding Script

Usage: node scripts/seed-books.js <libraryId> <librarianId> [count]

Arguments:
  libraryId    - ID of the library to add books to
  librarianId  - ID of the librarian who will own the books
  count        - Number of books to create (default: 20)

Examples:
  node scripts/seed-books.js lib-123 librarian-456
  node scripts/seed-books.js lib-123 librarian-456 50
  node scripts/seed-books.js lib-123 librarian-456 100

This script will create realistic sample books perfect for testing 
pagination and search functionality.
    `);
    process.exit(1);
  }
  
  const libraryId = args[0];
  const librarianId = args[1];
  const count = args[2] ? parseInt(args[2], 10) : 20;
  
  if (isNaN(count) || count < 1) {
    console.error('❌ Count must be a positive number');
    process.exit(1);
  }
  
  if (count > 200) {
    console.error('❌ Maximum 200 books per run (to prevent accidental spam)');
    process.exit(1);
  }
  
  await seedBooks(libraryId, librarianId, count);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { seedBooks };
