-- Install pgvector extension
-- Run this SQL in your PostgreSQL database:
CREATE EXTENSION IF NOT EXISTS vector;

-- Convert the embedding column to vector type
-- This would require a migration to change the column type
ALTER TABLE books ADD COLUMN embedding_vector vector(384);

-- Update existing embeddings (convert from JSON to vector)
UPDATE books 
SET embedding_vector = embedding::text::vector 
WHERE embedding IS NOT NULL;

-- Create vector similarity index for fast searches
CREATE INDEX books_embedding_vector_idx ON books 
USING ivfflat (embedding_vector vector_cosine_ops) 
WITH (lists = 100);

-- Example query for cosine similarity search
-- SELECT id, title, 1 - (embedding_vector <=> '[query_vector_here]') as similarity
-- FROM books 
-- WHERE library_id = $1 AND embedding_vector IS NOT NULL
-- ORDER BY embedding_vector <=> '[query_vector_here]'
-- LIMIT 50;
