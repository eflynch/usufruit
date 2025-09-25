-- Migration to add pgvector support
-- First install the extension in your PostgreSQL database:
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column for embeddings
ALTER TABLE books ADD COLUMN embedding_vector vector(384);

-- Migrate existing JSON embeddings to vector format
UPDATE books 
SET embedding_vector = CAST(embedding AS text)::vector 
WHERE embedding IS NOT NULL AND embedding != 'null';

-- Create vector similarity index for fast cosine similarity searches
-- Using IVFFlat index which is good for cosine similarity
CREATE INDEX books_embedding_vector_cosine_idx ON books 
USING ivfflat (embedding_vector vector_cosine_ops) 
WITH (lists = 100);

-- Optional: Create index for L2 distance as well
-- CREATE INDEX books_embedding_vector_l2_idx ON books 
-- USING ivfflat (embedding_vector vector_l2_ops) 
-- WITH (lists = 100);
