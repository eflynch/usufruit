// Server-side semantic search using Transformers.js
// This will run on the Node.js server, not in the browser

import { Book } from '@usufruit/models';

export interface SemanticSearchResult {
  book: Book;
  semanticScore: number;
  ngramMatch: boolean;
}

export interface HybridSearchResult {
  books: Book[];
  semanticResults: SemanticSearchResult[];
  totalMatches: number;
}

/**
 * Generate text content for embedding from a book
 */
export function getBookEmbeddingText(book: Book): string {
  const parts = [
    book.title,
    book.author || '',
    book.description || '',
    // Add other searchable fields as needed
  ].filter(Boolean);
  
  return parts.join(' ').toLowerCase().trim();
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Combine ngram and semantic search results
 * Prioritizes ngram matches but adds semantic matches for better coverage
 */
export function combineSearchResults(
  ngramBooks: Book[],
  semanticResults: SemanticSearchResult[],
  semanticThreshold = 0.4
): HybridSearchResult {
  const ngramIds = new Set(ngramBooks.map(book => book.id));
  
  // Get high-quality semantic matches that aren't already in ngram results
  const additionalSemanticBooks = semanticResults
    .filter(result => 
      result.semanticScore >= semanticThreshold && 
      !ngramIds.has(result.book.id)
    )
    .map(result => result.book);
  
  // Combine results: ngram first (higher priority), then semantic
  const combinedBooks = [...ngramBooks, ...additionalSemanticBooks];
  
  // Mark which results came from ngram vs semantic
  const enhancedResults = semanticResults.map(result => ({
    ...result,
    ngramMatch: ngramIds.has(result.book.id)
  }));
  
  return {
    books: combinedBooks,
    semanticResults: enhancedResults,
    totalMatches: combinedBooks.length
  };
}
