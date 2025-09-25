import { DatabaseService } from '@usufruit/database';
import { generateEmbedding } from '../utils/embedding-service';
import { getBookEmbeddingText, cosineSimilarity, combineSearchResults, SemanticSearchResult } from '../utils/semantic-search';
import { prisma } from '@usufruit/database';

/**
 * Enhanced database service with semantic search capabilities
 */
export class SemanticDatabaseService extends DatabaseService {
  
  /**
   * Generate and store embedding for a book
   */
  static async generateBookEmbedding(bookId: string): Promise<void> {
    try {
      // Get the book data
      const book = await this.getBookById(bookId);
      if (!book) return;

      // Generate embedding text
      const embeddingText = getBookEmbeddingText(book);
      
      // Generate embedding vector
      const embeddingVector = await generateEmbedding(embeddingText);
      
      // Store as JSON string in database
      await prisma.book.update({
        where: { id: bookId },
        data: { embedding: JSON.stringify(embeddingVector) }
      });
      
      console.log(`Generated embedding for book: ${book.title}`);
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
    const { page = 1, limit = 50, search, semanticThreshold = 0.7 } = options;
    
    if (!search) {
      // No search query - use regular pagination
      return await this.getBooksByLibraryIdPaginated(libraryId, { page, limit });
    }

    // Get ngram search results first
    const ngramResults = await this.getBooksByLibraryIdPaginated(
      libraryId, 
      { page, limit: 100, search } // Get more for combining
    );

    // If semantic search is disabled or no results to enhance, return ngram only
    if (!process.env.ENABLE_SEMANTIC_SEARCH || ngramResults.books.length >= limit) {
      return {
        books: ngramResults.books.slice(0, limit),
        pagination: {
          ...ngramResults.pagination,
          totalCount: Math.min(ngramResults.pagination.totalCount, limit)
        }
      };
    }

    try {
      // Perform semantic search
      const semanticResults = await this.performSemanticSearch(libraryId, search, semanticThreshold);
      
      // Combine results
      const combined = combineSearchResults(ngramResults.books, semanticResults, semanticThreshold);
      
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
   */
  private static async performSemanticSearch(
    libraryId: string,
    query: string,
    threshold: number
  ): Promise<SemanticSearchResult[]> {
    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query);
    
    // Get all books with embeddings
    const booksWithEmbeddings = await prisma.book.findMany({
      where: {
        libraryId,
        embedding: { not: null }
      },
      include: {
        library: true,
        librarian: true,
        loans: {
          where: { returnedAt: null }
        }
      }
    });

    const results: SemanticSearchResult[] = [];

    for (const book of booksWithEmbeddings) {
      try {
        // Parse stored embedding
        if (!book.embedding) continue;
        const bookEmbedding = JSON.parse(book.embedding);
        
        // Calculate similarity
        const similarity = cosineSimilarity(queryEmbedding, bookEmbedding);
        
        if (similarity >= threshold) {
          results.push({
            book,
            semanticScore: similarity,
            ngramMatch: false // Will be set later in combineSearchResults
          });
        }
      } catch (error) {
        console.error(`Error processing embedding for book ${book.id}:`, error);
      }
    }

    // Sort by semantic score (highest first)
    return results.sort((a, b) => b.semanticScore - a.semanticScore);
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
