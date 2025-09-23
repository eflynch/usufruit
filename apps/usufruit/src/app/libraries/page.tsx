'use client';

import { useEffect, useState } from 'react';
import { Library } from '@usufruit/models';
import styles from './libraries.module.css';

export default function LibrariesPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLibrary, setNewLibrary] = useState({
    name: '',
    description: '',
    location: ''
  });

  useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/libraries');
      if (!response.ok) {
        throw new Error('Failed to fetch libraries');
      }
      const data = await response.json();
      setLibraries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/libraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLibrary),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create library');
      }
      
      // Reset form and refresh libraries
      setNewLibrary({ name: '', description: '', location: '' });
      await fetchLibraries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create library');
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (error) return <div className={styles.container}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1>📚 Community Libraries</h1>
      
      {/* Create New Library Form */}
      <div className={styles.createForm}>
        <h2>Create New Library</h2>
        <form onSubmit={createLibrary}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Library Name:</label>
            <input
              type="text"
              id="name"
              value={newLibrary.name}
              onChange={(e) => setNewLibrary({ ...newLibrary, name: e.target.value })}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={newLibrary.description}
              onChange={(e) => setNewLibrary({ ...newLibrary, description: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="location">Location:</label>
            <input
              type="text"
              id="location"
              value={newLibrary.location}
              onChange={(e) => setNewLibrary({ ...newLibrary, location: e.target.value })}
            />
          </div>
          
          <button type="submit" className={styles.submitButton}>
            Create Library
          </button>
        </form>
      </div>

      {/* Libraries List */}
      <div className={styles.librariesList}>
        <h2>Existing Libraries ({libraries.length})</h2>
        {libraries.length === 0 ? (
          <p>No libraries found. Create one above!</p>
        ) : (
          <div className={styles.librariesGrid}>
            {libraries.map((library) => (
              <div key={library.id} className={styles.libraryCard}>
                <h3>{library.name}</h3>
                {library.description && (
                  <p className={styles.description}>{library.description}</p>
                )}
                {library.location && (
                  <p className={styles.location}>📍 {library.location}</p>
                )}
                <div className={styles.metadata}>
                  <small>
                    Created: {new Date(library.createdAt).toLocaleDateString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
