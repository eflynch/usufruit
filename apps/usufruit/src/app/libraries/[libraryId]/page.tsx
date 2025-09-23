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
  const [activeTab, setActiveTab] = useState<'books' | 'librarians' | 'my-borrowed' | 'my-books'>('books');

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

  // Helper functions for filtering data
  const myBorrowedBooks = books.filter(book => 
    book.loans && book.loans.some(loan => loan.librarianId === auth?.id)
  );
  
  const myBooks = books.filter(book => book.librarianId === auth?.id);

  // Tab rendering functions
  const renderTabButtons = () => (
    <div style={{ 
      borderBottom: '1px solid #999', 
      marginBottom: '20px',
      display: 'flex',
      gap: '0'
    }}>
      {[
        { id: 'books', label: 'All Books', count: books.length },
        { id: 'librarians', label: 'Librarians', count: librarians.length, authRequired: true },
        { id: 'my-borrowed', label: 'My Borrowed', count: myBorrowedBooks.length, authRequired: true },
        { id: 'my-books', label: 'My Books', count: myBooks.length, authRequired: true }
      ].map(tab => {
        if (tab.authRequired && !isAuthenticated) return null;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'books' | 'librarians' | 'my-borrowed' | 'my-books')}
            style={{
              padding: '8px 16px',
              border: '1px solid #999',
              borderBottom: activeTab === tab.id ? '1px solid white' : '1px solid #999',
              background: activeTab === tab.id ? 'white' : '#f5f5f5',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              marginBottom: '-1px',
              position: 'relative',
              zIndex: activeTab === tab.id ? 1 : 0
            }}
          >
            {tab.label} ({tab.count})
          </button>
        );
      }).filter(Boolean)}
    </div>
  );

  const renderAllBooksTab = () => (
    <>
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>all books ({books.length})</h2>
      {books.length === 0 ? (
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>no books in this library yet</p>
      ) : (
        <table style={{ width: '100%', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>title</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>assigned librarian</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>status</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => {
              const hasActiveLoan = book.loans && book.loans.length > 0;
              return (
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
                  {book.librarian?.name || '—'}
                </td>
                <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                  {hasActiveLoan ? (
                    <span style={{ color: 'orange', fontSize: '12px' }}>checked out</span>
                  ) : (
                    <span style={{ color: 'green', fontSize: '12px' }}>available</span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );

  const renderLibrariansTab = () => (
    <>
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
                  {librarian.id === auth?.id && ' (you)'}
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

      {auth?.isSuper && (
        <p style={{ margin: '0 0 20px 0' }}>
          <Link href={`/libraries/${libraryId}/librarians/new`} style={{ color: 'blue' }}>+ add a librarian</Link>
        </p>
      )}
    </>
  );

  const renderMyBorrowedTab = () => (
    <>
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>my borrowed books ({myBorrowedBooks.length})</h2>
      {myBorrowedBooks.length === 0 ? (
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>you haven&apos;t borrowed any books</p>
      ) : (
        <table style={{ width: '100%', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>title</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>borrowed date</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>due date</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>status</th>
            </tr>
          </thead>
          <tbody>
            {myBorrowedBooks.map((book) => {
              const myLoan = book.loans?.find(loan => loan.librarianId === auth?.id);
              return (
                <tr key={book.id}>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    <Link href={`/libraries/${libraryId}/books/${book.id}`} style={{ color: 'blue' }}>
                      {book.title}
                    </Link>
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {myLoan ? new Date(myLoan.borrowedAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {myLoan?.dueDate ? new Date(myLoan.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {myLoan?.returnedAt ? (
                      <span style={{ color: 'green', fontSize: '12px' }}>returned</span>
                    ) : (
                      <span style={{ color: 'orange', fontSize: '12px' }}>borrowed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );

  const renderMyBooksTab = () => (
    <>
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>my books ({myBooks.length})</h2>
      
      <p style={{ margin: '0 0 20px 0' }}>
        <Link href={`/libraries/${libraryId}/books/new`} style={{ color: 'blue' }}>+ add a book</Link>
      </p>

      {myBooks.length === 0 ? (
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>you haven&apos;t added any books yet</p>
      ) : (
        <table style={{ width: '100%', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>title</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>status</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>added</th>
            </tr>
          </thead>
          <tbody>
            {myBooks.map((book) => {
              const hasActiveLoan = book.loans && book.loans.length > 0;
              return (
                <tr key={book.id}>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    <Link href={`/libraries/${libraryId}/books/${book.id}`} style={{ color: 'blue' }}>
                      {book.title}
                    </Link>
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {hasActiveLoan ? (
                      <span style={{ color: 'orange', fontSize: '12px' }}>checked out</span>
                    ) : (
                      <span style={{ color: 'green', fontSize: '12px' }}>available</span>
                    )}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {new Date(book.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'books':
        return renderAllBooksTab();
      case 'librarians':
        return renderLibrariansTab();
      case 'my-borrowed':
        return renderMyBorrowedTab();
      case 'my-books':
        return renderMyBooksTab();
      default:
        return renderAllBooksTab();
    }
  };

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

      {/* Library info section */}
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

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />

      {/* Tab Navigation */}
      {renderTabButtons()}

      {/* Tab Content */}
      {renderActiveTab()}

    </div>
  );
}
