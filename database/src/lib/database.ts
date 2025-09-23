import { PrismaClient } from '@prisma/client';

// Global Prisma instance to prevent multiple connections in development
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client
export const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Database utility functions for Usufruit
export class DatabaseService {
  // Library operations
  static async createLibrary(data: {
    name: string;
    description?: string;
    location?: string;
  }) {
    return prisma.library.create({
      data,
      include: {
        librarians: true,
        books: true,
      },
    });
  }

  static async getLibraryById(id: string) {
    return prisma.library.findUnique({
      where: { id },
      include: {
        librarians: true,
        books: true,
      },
    });
  }

  static async updateLibrary(id: string, data: {
    name?: string;
    description?: string;
    location?: string;
  }) {
    return prisma.library.update({
      where: { id },
      data,
      include: {
        librarians: true,
        books: true,
      },
    });
  }

  // Librarian operations
  static async createLibrarian(data: {
    name: string;
    contactInfo: string;
    libraryId: string;
  }) {
    return prisma.librarian.create({
      data,
      include: {
        library: true,
        books: true,
      },
    });
  }

  static async getLibrarians() {
    return prisma.librarian.findMany({
      include: {
        library: true,
        books: true,
      },
    });
  }

  static async getLibrarianById(id: string) {
    return prisma.librarian.findUnique({
      where: { id },
      include: {
        library: true,
        books: true,
      },
    });
  }

  static async getLibrariansByLibraryId(libraryId: string) {
    return prisma.librarian.findMany({
      where: { libraryId },
      include: {
        library: true,
        books: true,
      },
    });
  }

  // Book operations
  static async createBook(data: {
    title: string;
    author?: string;
    description?: string;
    organizingRules?: string;
    checkInInstructions?: string;
    checkOutInstructions?: string;
    libraryId: string;
    librarianId: string;
  }) {
    return prisma.book.create({
      data,
      include: {
        library: true,
        librarian: true,
        loans: true,
      },
    });
  }

  static async getBooks() {
    return prisma.book.findMany({
      include: {
        library: true,
        librarian: true,
        loans: {
          where: {
            returnedAt: null, // Only active loans
          },
        },
      },
    });
  }

  static async getBookById(id: string) {
    return prisma.book.findUnique({
      where: { id },
      include: {
        library: true,
        librarian: true,
        loans: true,
      },
    });
  }

  static async getBooksByLibraryId(libraryId: string) {
    return prisma.book.findMany({
      where: { libraryId },
      include: {
        library: true,
        librarian: true,
        loans: {
          where: {
            returnedAt: null, // Only active loans
          },
        },
      },
    });
  }

  static async updateBook(id: string, data: {
    title?: string;
    author?: string;
    description?: string;
    organizingRules?: string;
    checkInInstructions?: string;
    checkOutInstructions?: string;
  }) {
    return prisma.book.update({
      where: { id },
      data,
      include: {
        library: true,
        librarian: true,
        loans: true,
      },
    });
  }

  // Loan operations
  static async createLoan(data: {
    bookId: string;
    librarianId: string;
    dueDate?: Date;
  }) {
    return prisma.loan.create({
      data,
      include: {
        book: true,
        librarian: true,
      },
    });
  }

  static async returnBook(loanId: string) {
    return prisma.loan.update({
      where: { id: loanId },
      data: {
        returnedAt: new Date(),
      },
      include: {
        book: true,
        librarian: true,
      },
    });
  }

  static async getActiveLoans() {
    return prisma.loan.findMany({
      where: {
        returnedAt: null,
      },
      include: {
        book: true,
        librarian: true,
      },
    });
  }

  static async getLoanHistory() {
    return prisma.loan.findMany({
      include: {
        book: true,
        librarian: true,
      },
      orderBy: {
        borrowedAt: 'desc',
      },
    });
  }

  static async getLoansByBookId(bookId: string) {
    return prisma.loan.findMany({
      where: { bookId },
      include: {
        book: true,
        librarian: true,
      },
      orderBy: {
        borrowedAt: 'desc',
      },
    });
  }

  static async getActiveLoansByBookId(bookId: string) {
    return prisma.loan.findMany({
      where: { 
        bookId,
        returnedAt: null,
      },
      include: {
        book: true,
        librarian: true,
      },
    });
  }
}
