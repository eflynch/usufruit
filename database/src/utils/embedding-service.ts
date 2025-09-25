// Server-side embedding service using Transformers.js
// This runs only on the Node.js server

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipeline: any = null;
let isInitializing = false;

/**
 * Initialize the embedding pipeline (lazy loading)
 * Uses a lightweight sentence transformer model
 */
async function initializePipeline() {
  if (pipeline) return pipeline;
  if (isInitializing) {
    // Wait for existing initialization
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return pipeline;
  }

  try {
    isInitializing = true;
    console.log('Initializing semantic search embedding model...');
    
    // Import Transformers.js dynamically (server-side only)
    const { pipeline: createPipeline } = await import('@xenova/transformers');
    
    // Use a lightweight sentence transformer model
    // all-MiniLM-L6-v2 is small (~23MB) and good for semantic search
    pipeline = await createPipeline(
      'feature-extraction', 
      'Xenova/all-MiniLM-L6-v2',
      { 
        // Cache model locally to avoid re-downloading
        cache_dir: process.env.NODE_ENV === 'production' ? './.cache' : './node_modules/.cache'
      }
    );
    
    console.log('Semantic search model loaded successfully');
    return pipeline;
  } catch (error) {
    console.error('Failed to initialize semantic search model:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Generate embedding vector for a text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = await initializePipeline();
    
    // Generate embedding
    if (!model) {
      throw new Error('Model pipeline is not initialized');
    }
    
    const output = await model(text.trim(), {
      pooling: 'mean',
      normalize: true
    });
    
    // Convert to regular array
    return Array.from(output.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback: return zero vector
    return new Array(384).fill(0); // all-MiniLM-L6-v2 outputs 384-dim vectors
  }
}

/**
 * Check if the embedding service is available
 */
export async function isEmbeddingServiceAvailable(): Promise<boolean> {
  try {
    await initializePipeline();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get model info
 */
export function getModelInfo() {
  return {
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    size: '~23MB',
    description: 'Lightweight sentence transformer for semantic search'
  };
}
