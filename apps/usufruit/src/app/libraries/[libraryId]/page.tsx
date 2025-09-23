'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Library, Book, Librarian } from '@usufruit/models';
import LibraryAuthStatus from '../../../components/LibraryAuthStatus';
import { useLibraryAuth } from '../../../utils/auth-hooks';

export default function LibraryPage() {
  const params = useParams();
  const libraryId = params?.libraryId as string;
  
  const [library, setLibrary] = useState<Library | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [librarians, setLibrarians] = useState<Librarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { auth, isAuthenticated, authHeaders } = useLibraryAuth(libraryId);

  useEffect(() => {
    if (!libraryId) return;

    const fetchLibraryData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch library details
        const libraryResponse = await fetch(`/api/libraries/${libraryId}`);
        if (!libraryResponse.ok) {
          if (libraryResponse.status === 404) {
            throw new Error('Library not found');
          }
          throw new Error('Failed to fetch library');
        }
        const libraryData = await libraryResponse.json();
        setLibrary(libraryData);

        // Fetch books
        const booksResponse = await fetch(`/api/libraries/${libraryId}/books`);
        if (booksResponse.ok) {
          const booksData = await booksResponse.json();
          setBooks(booksData);
        }

        // Fetch librarians (only if authenticated)
        if (isAuthenticated) {
          const librariansResponse = await fetch(`/api/libraries/${libraryId}/librarians`, {
            headers: authHeaders,
          });
          if (librariansResponse.ok) {
            const librariansData = await librariansResponse.json();
            setLibrarians(librariansData);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryData();
  }, [libraryId, isAuthenticated, authHeaders]);

  if (loading) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        margin: '20px',
        maxWidth: '800px'
      }}>
        loading library...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        margin: '20px',
        maxWidth: '800px'
      }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>error</h1>
        <p style={{ margin: '0 0 20px 0', color: 'red' }}>{error}</p>
        <p>
          <Link href="/" style={{ color: 'blue' }}>&larr; back to home</Link>
        </p>
      </div>
    );
  }

  if (!library) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        margin: '20px',
        maxWidth: '800px'
      }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>library not found</h1>
        <p>
          <Link href="/" style={{ color: 'blue' }}>&larr; back to home</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      fontSize: '14px', 
      lineHeight: '1.4',
      margin: '20px',
      maxWidth: '800px'
    }}>
      <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>{library.name}</h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        {library.description || 'no description'}
      </p>
      
      <p style={{ margin: '0 0 20px 0' }}>
        <Link href="/" style={{ color: 'blue' }}>&larr; back to home</Link>
      </p>

      <LibraryAuthStatus libraryId={libraryId} libraryName={library.name} />

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />

      {/* Books Section */}
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>books ({books.length})</h2>
      {books.length === 0 ? (
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>no books in this library yet</p>
      ) : (
        <table style={{ width: '100%', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>title</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>author</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>status</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id}>
                <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                  {auth ? (
                    <Link href={`/libraries/${libraryId}/books/${book.id}`} style={{ color: 'blue' }}>
                      {book.title}
                    </Link>
                  ) : (
                    book.title
                  )}
                </td>
                <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                  {book.author || '—'}
                </td>
                <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                  <span style={{ color: 'green', fontSize: '12px' }}>available</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {auth && (
        <p style={{ margin: '0 0 20px 0' }}>
          <Link href={`/libraries/${libraryId}/books/new`} style={{ color: 'blue' }}>+ add a book</Link>
        </p>
      )}

      {/* Librarians Section - only show if authenticated */}
      {auth && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
          
          <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>librarians ({librarians.length})</h2>
          {librarians.length === 0 ? (
            <p style={{ margin: '0 0 15px 0', color: '#666' }}>no librarians found</p>
          ) : (
            <table style={{ width: '100%', marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>name</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>contact</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>role</th>
                </tr>
              </thead>
              <tbody>
                {librarians.map((librarian) => (
                  <tr key={librarian.id}>
                    <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                      {librarian.name}
                      {librarian.id === auth.id && ' (you)'}
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                      {librarian.contactInfo}
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                      {librarian.isSuper ? 'super librarian' : 'librarian'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {auth.isSuper && (
            <p style={{ margin: '0 0 20px 0' }}>
              <Link href={`/libraries/${libraryId}/librarians/new`} style={{ color: 'blue' }}>+ add a librarian</Link>
            </p>
          )}
        </>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />

      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>library info</h2>
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>id</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontFamily: 'monospace', fontSize: '12px' }}>
              {library.id}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>location</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
              {library.location || '—'}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>created</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
              {new Date(library.createdAt).toLocaleDateString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
