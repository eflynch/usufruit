import { PrismaClient } from '@prisma/client';
import { Book, Library, Librarian, Loan } from '@usufruit/models';

// Type for semantic search results
interface SemanticSearchResult {
  book: Book & { library: Library; librarian: Librarian; loans: Loan[] };
  semanticScore: number;
  ngramMatch: boolean;
}

// Global Prisma instance to prevent multiple connections in development
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client
export const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Simple in-memory cache for semantic search results
const semanticSearchCache = new Map<string, { results: SemanticSearchResult[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  static async getLibrariansByLibraryIdSecurePaginated(
    libraryId: string,
    requestingLibrarianId?: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, search } = options;
    const skip = (page - 1) * limit;

    // Build search condition - handle both PostgreSQL and SQLite
    // SQLite doesn't support mode: 'insensitive', but PostgreSQL does
    const isPostgreSQL = process.env.DATABASE_URL?.includes('postgresql') || process.env.DATABASE_URL?.includes('postgres');
    
    const searchCondition = search
      ? {
          name: { contains: search, ...(isPostgreSQL && { mode: 'insensitive' as const }) },
        }
      : {};

    const where = {
      libraryId,
      ...searchCondition,
    };

    // Get total count for pagination metadata
    const totalCount = await prisma.librarian.count({ where });

    // Get paginated results
    const librarians = await prisma.librarian.findMany({
      where,
      include: {
        library: true,
        books: true,
      },
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    });

    // Apply security filtering to results
    let filteredLibrarians;
    if (!requestingLibrarianId) {
      // Remove secret keys from all librarians
      filteredLibrarians = librarians.map(librarian => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secretKey, ...librarianWithoutSecret } = librarian;
        return librarianWithoutSecret;
      });
    } else {
      // Check if requesting librarian is super
      const requestingLibrarian = await prisma.librarian.findUnique({
        where: { id: requestingLibrarianId },
      });

      if (requestingLibrarian?.isSuper) {
        // Super librarians can see all secret keys
        filteredLibrarians = librarians;
      } else {
        // Regular librarians can only see their own secret key
        filteredLibrarians = librarians.map(librarian => {
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

    return {
      librarians: filteredLibrarians,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1,
      },
    };
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

  static async updateLibrarianDetails(librarianId: string, data: { name?: string; contactInfo?: string }) {
    return prisma.librarian.update({
      where: { id: librarianId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contactInfo !== undefined && { contactInfo: data.contactInfo }),
      },
      include: {
        library: true,
        books: true,
      },
    });
  }

  static async deleteLibrarian(id: string, options: { 
    reassignBooksTo?: string;
    deleteBooksAndLoans?: boolean;
  } = {}) {
    return prisma.$transaction(async (tx) => {
      const { reassignBooksTo, deleteBooksAndLoans = false } = options;

      // Get the librarian first to validate they exist
      const librarian = await tx.librarian.findUnique({
        where: { id },
        include: { books: true, loans: true },
      });

      if (!librarian) {
        throw new Error('Librarian not found');
      }

      if (deleteBooksAndLoans) {
        // Delete all loans for books owned by this librarian
        await tx.loan.deleteMany({
          where: { book: { librarianId: id } },
        });

        // Delete all books owned by this librarian
        await tx.book.deleteMany({
          where: { librarianId: id },
        });

        // Delete loans made by this librarian (not covered above)
        await tx.loan.deleteMany({
          where: { librarianId: id },
        });
      } else if (reassignBooksTo) {
        // Verify the target librarian exists and is in the same library
        const targetLibrarian = await tx.librarian.findUnique({
          where: { id: reassignBooksTo },
        });

        if (!targetLibrarian || targetLibrarian.libraryId !== librarian.libraryId) {
          throw new Error('Target librarian not found or not in the same library');
        }

        // Reassign all books to the target librarian
        await tx.book.updateMany({
          where: { librarianId: id },
          data: { librarianId: reassignBooksTo },
        });

        // Reassign all loans to the target librarian
        await tx.loan.updateMany({
          where: { librarianId: id },
          data: { librarianId: reassignBooksTo },
        });
      } else if (librarian.books.length > 0 || librarian.loans.length > 0) {
        // If librarian has books or loans and no handling option specified, throw error
        throw new Error('Cannot delete librarian with existing books or loans. Please specify reassignBooksTo or deleteBooksAndLoans option.');
      }

      // Finally, delete the librarian
      return tx.librarian.delete({
        where: { id },
        include: {
          library: true,
        },
      });
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
    const book = await prisma.book.create({
      data,
      include: {
        library: true,
        librarian: true,
        loans: true,
      },
    });

    // Generate embedding for the new book asynchronously
    this.generateBookEmbedding(book.id).catch(error => {
      console.error(`Failed to generate embedding for new book ${book.id}:`, error);
    });

    return book;
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

  static async getBooksByLibraryIdPaginated(
    libraryId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, search } = options;
    const skip = (page - 1) * limit;

    // Build search condition - handle both PostgreSQL and SQLite
    // SQLite doesn't support mode: 'insensitive', but PostgreSQL does
    const isPostgreSQL = process.env.DATABASE_URL?.includes('postgresql') || process.env.DATABASE_URL?.includes('postgres');
    
    const searchCondition = search
      ? {
          OR: [
            { title: { contains: search, ...(isPostgreSQL && { mode: 'insensitive' as const }) } },
            { description: { contains: search, ...(isPostgreSQL && { mode: 'insensitive' as const }) } },
            { author: { contains: search, ...(isPostgreSQL && { mode: 'insensitive' as const }) } },
          ],
        }
      : {};

    const where = {
      libraryId,
      ...searchCondition,
    };

    // Get total count for pagination metadata
    const totalCount = await prisma.book.count({ where });

    // Get paginated results
    const books = await prisma.book.findMany({
      where,
      include: {
        library: true,
        librarian: true,
        loans: {
          where: {
            returnedAt: null, // Only active loans
          },
        },
      },
      skip,
      take: limit,
      orderBy: { title: 'asc' },
    });

    return {
      books,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1,
      },
    };
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

  static async deleteBook(id: string) {
    // Use a transaction to ensure all related data is deleted together
    return prisma.$transaction(async (tx) => {
      // First delete all loans associated with this book
      await tx.loan.deleteMany({
        where: { bookId: id },
      });

      // Then delete the book itself
      return tx.book.delete({
        where: { id },
        include: {
          library: true,
          librarian: true,
        },
      });
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

  // ===== SEMANTIC SEARCH METHODS =====

  /**
   * Generate and store embedding for a book
   */
  static async generateBookEmbedding(bookId: string): Promise<void> {
    try {
      // Dynamic imports to avoid loading heavy ML models unless needed
      const { generateEmbedding } = await import('../utils/embedding-service.js');
      const { getBookEmbeddingText } = await import('../utils/semantic-search.js');

      // Get the book data
      const book = await this.getBookById(bookId);
      if (!book) return;

      // Generate embedding text
      const embeddingText = getBookEmbeddingText({ ...book, author: book.author ?? undefined } as Book);
      
      // Generate embedding vector
      const embeddingVector = await generateEmbedding(embeddingText);
      
      // Store as JSON string in database
      await prisma.book.update({
        where: { id: bookId },
        data: { embedding: JSON.stringify(embeddingVector) }
      });
    } catch (error) {
      console.error(`Error generating embedding for book ${bookId}:`, error);
    }
  }

  /**
   * Enhanced search with semantic capabilities
   */
  static async searchBooksWithSemantics(
    libraryId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      semanticThreshold?: number;
    } = {}
  ) {
    const { page = 1, limit = 50, search, semanticThreshold = 0.4 } = options;
    
    if (!search) {
      // No search query - use regular pagination
      return await this.getBooksByLibraryIdPaginated(libraryId, { page, limit });
    }

    // Get ngram search results first
    const ngramResults = await this.getBooksByLibraryIdPaginated(
      libraryId, 
      { page, limit: 100, search } // Get more for combining
    );

    // If we have enough ngram results, we can skip semantic enhancement for performance
    // But always try semantic search to get better results
    // if (ngramResults.books.length >= limit) {
    //   return {
    //     books: ngramResults.books.slice(0, limit),
    //     pagination: {
    //       ...ngramResults.pagination,
    //       totalCount: Math.min(ngramResults.pagination.totalCount, limit)
    //     }
    //   };
    // }

    try {
      // Perform semantic search with limited results for performance
      const semanticResults = await this.performSemanticSearch(libraryId, search, semanticThreshold, limit * 2);
      
      // Dynamic import for combining results
      const { combineSearchResults } = await import('../utils/semantic-search.js');
      
      // Combine results
      const combined = combineSearchResults(
        ngramResults.books.map(book => ({ ...book, author: book.author ?? undefined } as Book)), 
        semanticResults, 
        semanticThreshold
      );
      
      // Apply pagination to combined results
      const skip = (page - 1) * limit;
      const paginatedBooks = combined.books.slice(skip, skip + limit);
      
      return {
        books: paginatedBooks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(combined.totalMatches / limit),
          totalCount: combined.totalMatches,
          hasNextPage: skip + limit < combined.totalMatches,
          hasPreviousPage: page > 1,
        },
        semanticEnhanced: true,
        semanticResults: combined.semanticResults.slice(skip, skip + limit)
      };
    } catch (error) {
      console.error('Semantic search failed, falling back to ngram only:', error);
      return ngramResults;
    }
  }

  /**
   * Perform semantic search against book collection
   * Optimized for performance with early termination and caching
   */
  private static async performSemanticSearch(
    libraryId: string,
    query: string,
    threshold: number,
    maxResults = 50
  ) {
    // Check cache first
    const cacheKey = `${libraryId}:${query}:${threshold}`;
    const cached = semanticSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results.slice(0, maxResults);
    }

    // Dynamic imports to avoid loading heavy ML models unless needed
    const { generateEmbedding } = await import('../utils/embedding-service.js');
    const { cosineSimilarity } = await import('../utils/semantic-search.js');

    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query);
    // Get books with embeddings - limit database overhead by selecting only needed fields
    const booksWithEmbeddings = await prisma.book.findMany({
      where: {
        libraryId,
        embedding: { not: null }
      },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        borrowDurationDays: true,
        organizingRules: true,
        checkInInstructions: true,
        checkOutInstructions: true,
        createdAt: true,
        updatedAt: true,
        libraryId: true,
        librarianId: true,
        embedding: true,
        library: true,
        librarian: true,
        loans: {
          where: { returnedAt: null }
        }
      }
    });

    // If we have very few books with embeddings, try to generate some missing ones
    if (booksWithEmbeddings.length < 5) {
      const generated = await this.generateMissingEmbeddings(libraryId, 20);
      
      // Re-fetch if we generated new embeddings
      if (generated > 0) {
        const updatedBooks = await prisma.book.findMany({
          where: {
            libraryId,
            embedding: { not: null }
          },
          select: {
            id: true,
            title: true,
            author: true,
            description: true,
            borrowDurationDays: true,
            organizingRules: true,
            checkInInstructions: true,
            checkOutInstructions: true,
            createdAt: true,
            updatedAt: true,
            libraryId: true,
            librarianId: true,
            embedding: true,
            library: true,
            librarian: true,
            loans: {
              where: { returnedAt: null }
            }
          }
        });
        booksWithEmbeddings.push(...updatedBooks.filter(book => 
          !booksWithEmbeddings.find(existing => existing.id === book.id)
        ));
      }
    }

    const results: SemanticSearchResult[] = [];
    const parsedEmbeddings = new Map<string, number[]>(); // Cache parsed embeddings

    for (const book of booksWithEmbeddings) {
      try {
        // Parse and cache embedding
        if (!book.embedding) continue;
        
        let bookEmbedding = parsedEmbeddings.get(book.id);
        if (!bookEmbedding) {
          bookEmbedding = JSON.parse(book.embedding) as number[];
          parsedEmbeddings.set(book.id, bookEmbedding);
        }
        
        // Calculate similarity
        const similarity = cosineSimilarity(queryEmbedding, bookEmbedding);
        
        if (similarity >= threshold) {
          results.push({
            book: book as Book & { library: Library; librarian: Librarian; loans: Loan[] },
            semanticScore: similarity,
            ngramMatch: false // Will be set later in combineSearchResults
          });
          
          // Early termination: if we have enough high-quality results, stop processing
          if (results.length >= maxResults * 2) {
            break;
          }
        }
      } catch (error) {
        console.error(`Error processing embedding for book ${book.id}:`, error);
      }
    }

    // Sort by semantic score (highest first) and limit results
    const sortedResults = results
      .sort((a, b) => b.semanticScore - a.semanticScore)
      .slice(0, maxResults);

    // Cache the results
    semanticSearchCache.set(cacheKey, {
      results: sortedResults,
      timestamp: Date.now()
    });

    // Clean up old cache entries occasionally
    if (semanticSearchCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of semanticSearchCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          semanticSearchCache.delete(key);
        }
      }
    }

    return sortedResults;
  }

  /**
   * Generate embeddings for books that don't have them (lazy loading)
   */
  static async generateMissingEmbeddings(libraryId: string, maxBooks = 10): Promise<number> {
    try {
      const booksWithoutEmbeddings = await prisma.book.findMany({
        where: {
          libraryId,
          embedding: null
        },
        take: maxBooks
      });

      let generated = 0;
      for (const book of booksWithoutEmbeddings) {
        await this.generateBookEmbedding(book.id);
        generated++;
      }

      return generated;
    } catch (error) {
      console.error('Error generating missing embeddings:', error);
      return 0;
    }
  }
}
