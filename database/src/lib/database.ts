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
    isSuper?: boolean;
  }) {
    // Generate a unique secret key for the new librarian
    const { randomBytes } = await import('crypto');
    const secretKey = randomBytes(32).toString('hex');
    
    return prisma.librarian.create({
      data: {
        ...data,
        secretKey,
      },
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

  static async getLibrarianByIdSecure(id: string, requestingLibrarianId?: string) {
    const librarian = await prisma.librarian.findUnique({
      where: { id },
      include: {
        library: true,
        books: true,
      },
    });

    if (!librarian) return null;

    // If no requesting librarian, remove secret key
    if (!requestingLibrarianId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { secretKey, ...librarianWithoutSecret } = librarian;
      return librarianWithoutSecret;
    }

    // Check if requesting librarian is super or the same librarian
    const requestingLibrarian = await prisma.librarian.findUnique({
      where: { id: requestingLibrarianId },
    });

    // Show secret key only if requesting librarian is super or it's their own profile
    if (requestingLibrarian?.isSuper || requestingLibrarianId === id) {
      return librarian;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { secretKey, ...librarianWithoutSecret } = librarian;
      return librarianWithoutSecret;
    }
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

  static async getLibrariansByLibraryIdSecure(libraryId: string, requestingLibrarianId?: string) {
    const librarians = await prisma.librarian.findMany({
      where: { libraryId },
      include: {
        library: true,
        books: true,
      },
    });

    if (!requestingLibrarianId) {
      // Remove secret keys from all librarians
      return librarians.map(librarian => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secretKey, ...librarianWithoutSecret } = librarian;
        return librarianWithoutSecret;
      });
    }

    // Check if requesting librarian is super
    const requestingLibrarian = await prisma.librarian.findUnique({
      where: { id: requestingLibrarianId },
    });

    if (requestingLibrarian?.isSuper) {
      // Super librarians can see all secret keys
      return librarians;
    } else {
      // Regular librarians can only see their own secret key
      return librarians.map(librarian => {
        if (librarian.id === requestingLibrarianId) {
          return librarian; // Show their own secret key
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { secretKey, ...librarianWithoutSecret } = librarian;
          return librarianWithoutSecret;
        }
      });
    }
  }

  static async authenticateLibrarian(secretKey: string) {
    return prisma.librarian.findUnique({
      where: { secretKey },
      include: {
        library: true,
        books: true,
      },
    });
  }

  static async updateLibrarianSuperStatus(librarianId: string, isSuper: boolean, requestingLibrarianId: string) {
    // Only super librarians can change super status
    const requestingLibrarian = await prisma.librarian.findUnique({
      where: { id: requestingLibrarianId },
    });

    if (!requestingLibrarian?.isSuper) {
      throw new Error('Only super librarians can modify super status');
    }

    return prisma.librarian.update({
      where: { id: librarianId },
      data: { isSuper },
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
    borrowDurationDays: number;
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
