-- Add index on embedding column for better semantic search performance
-- This improves query performance when filtering books with embeddings
CREATE INDEX IF NOT EXISTS "books_embedding_idx" ON "books"("embedding") WHERE "embedding" IS NOT NULL;