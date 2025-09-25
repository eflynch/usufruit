-- Add index on embedding column for better semantic search performance
-- Note: This creates a simple B-tree index. For production, consider pgvector extension with vector indexes
CREATE INDEX IF NOT EXISTS "Book_embedding_idx" ON "Book"("embedding") WHERE "embedding" IS NOT NULL;
