'use client';

import { useState } from 'react';
import { Library } from '@usufruit/models';
import styles from './libraries.module.css';

export default function LibrariesPage() {
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('');
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLibrary = async (libraryId: string) => {
    if (!libraryId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/libraries/${libraryId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Library not found');
        }
        throw new Error('Failed to fetch library');
      }
      const data = await response.json();
      setLibrary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLibrary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLibraryIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLibraryId.trim()) {
      fetchLibrary(selectedLibraryId.trim());
    }
  };

  return (
    <div className={styles.container}>
      <h1>📚 Library Access</h1>
      
      <div className={styles.accessForm}>
        <h2>Enter Library ID</h2>
        <p>To access a library, you need its unique library ID.</p>
        <form onSubmit={handleLibraryIdSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="libraryId">Library ID:</label>
            <input
              type="text"
              id="libraryId"
              value={selectedLibraryId}
              onChange={(e) => setSelectedLibraryId(e.target.value)}
              placeholder="Enter library ID (e.g., clxxxxx...)"
              required
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Loading...' : 'Access Library'}
          </button>
        </form>
      </div>

      {error && (
        <div className={styles.error}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {library && (
        <div className={styles.libraryDetails}>
          <h2>📖 {library.name}</h2>
          {library.description && (
            <p className={styles.description}>{library.description}</p>
          )}
          {library.location && (
            <p className={styles.location}>📍 {library.location}</p>
          )}
          
          <div className={styles.libraryStats}>
            <div className={styles.stat}>
              <h4>Librarians</h4>
              <p>{library.librarians?.length || 0}</p>
            </div>
            <div className={styles.stat}>
              <h4>Books</h4>
              <p>{library.books?.length || 0}</p>
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              className={styles.actionButton}
              onClick={() => window.open(`/libraries/${library.id}/books`, '_blank')}
            >
              📚 View Books
            </button>
            <button 
              className={styles.actionButton}
              onClick={() => window.open(`/libraries/${library.id}/librarians`, '_blank')}
            >
              👥 View Librarians
            </button>
          </div>

          <div className={styles.metadata}>
            <small>
              Created: {new Date(library.createdAt).toLocaleDateString()}
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
