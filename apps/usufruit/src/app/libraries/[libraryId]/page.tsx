'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Library, Book, Librarian } from '@usufruit/models';
import LibraryAuthStatus from '../../../components/LibraryAuthStatus';
import { LibraryPageContainer, LibrarySectionDivider } from '../../../components/LibraryPageComponents';
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
  const [promotingLibrarianId, setPromotingLibrarianId] = useState<string | null>(null);

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

  // Helper function to check if a book is overdue
  const isBookOverdue = (book: Book) => {
    if (!auth?.id) return false;
    const myLoan = book.loans?.find(loan => loan.librarianId === auth.id && !loan.returnedAt);
    if (!myLoan?.dueDate) return false;
    return new Date(myLoan.dueDate) < new Date();
  };

  // Sort borrowed books to put overdue ones first
  const sortedMyBorrowedBooks = [...myBorrowedBooks].sort((a, b) => {
    const aOverdue = isBookOverdue(a);
    const bOverdue = isBookOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return 0;
  });

  // Count overdue books
  const overdueCount = myBorrowedBooks.filter(isBookOverdue).length;

  // Tab rendering functions
  const renderTabButtons = () => (
    <div style={{ 
      borderBottom: '1px solid #999', 
      marginBottom: '20px',
      display: 'flex',
      gap: '0'
    }}>
      {[
        { id: 'books', label: 'All Items', count: books.length },
        { id: 'librarians', label: 'Librarians', count: librarians.length, authRequired: true },
        { 
          id: 'my-borrowed', 
          label: 'My Borrowed', 
          count: myBorrowedBooks.length, 
          overdueCount: overdueCount > 0 ? overdueCount : undefined,
          authRequired: true 
        },
        { id: 'my-books', label: 'My Items', count: myBooks.length, authRequired: true }
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
            {tab.overdueCount !== undefined && tab.overdueCount > 0 && (
              <span style={{ 
                color: '#dc2626', 
                fontWeight: 'bold',
                marginLeft: '4px'
              }}>
                [{tab.overdueCount} overdue]
              </span>
            )}
          </button>
        );
      }).filter(Boolean)}
    </div>
  );

  const renderAllBooksTab = () => (
    <>
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>all items ({books.length})</h2>
      {books.length === 0 ? (
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>no items in this library yet</p>
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

  const renderLibrariansTab = () => {
    const copyLoginLink = async (librarianKey: string, librarianName: string) => {
      const baseUrl = window.location.origin;
      const loginUrl = `${baseUrl}/libraries/${libraryId}/login/${librarianKey}`;
      
      try {
        await navigator.clipboard.writeText(loginUrl);
        alert(`Login link copied for ${librarianName}!\n\nYou can now share this link to let them log in directly.`);
      } catch {
        // Fallback for browsers that don't support clipboard API
        prompt('Copy this login link:', loginUrl);
      }
    };

    const promoteLibrarian = async (librarianId: string, librarianName: string) => {
      if (!auth?.isSuper) {
        alert('Only super librarians can promote other librarians.');
        return;
      }

      const confirmed = confirm(`Are you sure you want to promote ${librarianName} to super librarian?\n\nThis will give them the ability to add/remove librarians and change library settings.`);
      if (!confirmed) return;

      setPromotingLibrarianId(librarianId);

      try {
        const response = await fetch(`/api/libraries/${libraryId}/librarians/${librarianId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            isSuper: true,
          }),
        });

        if (response.ok) {
          // Update the librarians list to reflect the change
          setLibrarians(prev => prev.map(lib => 
            lib.id === librarianId 
              ? { ...lib, isSuper: true }
              : lib
          ));
          alert(`${librarianName} has been promoted to super librarian!`);
        } else {
          const errorData = await response.json();
          alert(`Failed to promote librarian: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error promoting librarian:', error);
        alert('Failed to promote librarian. Please try again.');
      } finally {
        setPromotingLibrarianId(null);
      }
    };

    const demoteLibrarian = async (librarianId: string, librarianName: string) => {
      if (!auth?.isSuper) {
        alert('Only super librarians can demote other librarians.');
        return;
      }

      if (librarianId === auth.id) {
        alert('You cannot demote yourself from super librarian status.');
        return;
      }

      const confirmed = confirm(`Are you sure you want to demote ${librarianName} from super librarian?\n\nThis will remove their ability to add/remove librarians and change library settings.`);
      if (!confirmed) return;

      setPromotingLibrarianId(librarianId);

      try {
        const response = await fetch(`/api/libraries/${libraryId}/librarians/${librarianId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            isSuper: false,
          }),
        });

        if (response.ok) {
          // Update the librarians list to reflect the change
          setLibrarians(prev => prev.map(lib => 
            lib.id === librarianId 
              ? { ...lib, isSuper: false }
              : lib
          ));
          alert(`${librarianName} has been demoted from super librarian.`);
        } else {
          const errorData = await response.json();
          alert(`Failed to demote librarian: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error demoting librarian:', error);
        alert('Failed to demote librarian. Please try again.');
      } finally {
        setPromotingLibrarianId(null);
      }
    };

    return (
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
                {(auth?.isSuper || auth) && (
                  <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999', minWidth: '300px', width: '300px' }}>actions</th>
                )}
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
                  {(auth?.isSuper || auth) && (
                    <td style={{ padding: '4px 8px', border: '1px solid #999', minWidth: '300px', width: '300px', whiteSpace: 'nowrap' }}>
                      {auth?.isSuper && librarian.secretKey && (
                        <>
                          <button
                            onClick={() => copyLoginLink(librarian.secretKey as string, librarian.name)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: '1px solid #999',
                              backgroundColor: '#f7fafc',
                              cursor: 'pointer',
                              marginRight: '4px',
                              fontFamily: 'inherit',
                              boxSizing: 'border-box',
                              verticalAlign: 'top',
                              lineHeight: '16px',
                              height: '28px'
                            }}
                          >
                            copy login link
                          </button>
                        </>
                      )}
                      {(auth?.isSuper || auth?.id === librarian.id) && (
                        <Link
                          href={`/libraries/${libraryId}/librarians/${librarian.id}/edit`}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #999',
                            backgroundColor: '#e6f3ff',
                            cursor: 'pointer',
                            marginRight: '4px',
                            textDecoration: 'none',
                            color: 'black',
                            display: 'inline-block',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                            verticalAlign: 'top',
                            lineHeight: '16px',
                            height: '28px'
                          }}
                        >
                          edit
                        </Link>
                      )}
                      {auth?.isSuper && !librarian.isSuper && (
                        <button
                          onClick={() => promoteLibrarian(librarian.id, librarian.name)}
                          disabled={promotingLibrarianId === librarian.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #999',
                            backgroundColor: promotingLibrarianId === librarian.id ? '#e5e5e5' : '#fff3cd',
                            cursor: promotingLibrarianId === librarian.id ? 'not-allowed' : 'pointer',
                            marginRight: '4px',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                            verticalAlign: 'top',
                            lineHeight: '16px',
                            height: '28px'
                          }}
                        >
                          {promotingLibrarianId === librarian.id ? 'promoting...' : 'promote to super'}
                        </button>
                      )}
                      {auth?.isSuper && librarian.isSuper && librarian.id !== auth?.id && (
                        <button
                          onClick={() => demoteLibrarian(librarian.id, librarian.name)}
                          disabled={promotingLibrarianId === librarian.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #999',
                            backgroundColor: promotingLibrarianId === librarian.id ? '#e5e5e5' : '#fee2e2',
                            cursor: promotingLibrarianId === librarian.id ? 'not-allowed' : 'pointer',
                            marginRight: '4px',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                            verticalAlign: 'top',
                            lineHeight: '16px',
                            height: '28px'
                          }}
                        >
                          {promotingLibrarianId === librarian.id ? 'demoting...' : 'remove super'}
                        </button>
                      )}
                    </td>
                  )}
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
  };

  const renderMyBorrowedTab = () => (
    <>
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>
        my borrowed items ({myBorrowedBooks.length})
        {overdueCount > 0 && (
          <span style={{ 
            color: '#dc2626', 
            fontSize: '14px', 
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            [{overdueCount} overdue]
          </span>
        )}
      </h2>
      {myBorrowedBooks.length === 0 ? (
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>you haven&apos;t borrowed any items</p>
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
            {sortedMyBorrowedBooks.map((book) => {
              const myLoan = book.loans?.find(loan => loan.librarianId === auth?.id);
              const isOverdue = isBookOverdue(book);
              const rowStyle = isOverdue ? { backgroundColor: '#fef2f2' } : {};
              
              return (
                <tr key={book.id} style={rowStyle}>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    <Link href={`/libraries/${libraryId}/books/${book.id}`} style={{ color: 'blue' }}>
                      {book.title}
                    </Link>
                    {isOverdue && (
                      <span style={{ 
                        color: '#dc2626', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        marginLeft: '8px'
                      }}>
                        OVERDUE
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {myLoan ? new Date(myLoan.borrowedAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ 
                    padding: '4px 8px', 
                    border: '1px solid #999',
                    color: isOverdue ? '#dc2626' : 'inherit',
                    fontWeight: isOverdue ? 'bold' : 'normal'
                  }}>
                    {myLoan?.dueDate ? new Date(myLoan.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {myLoan?.returnedAt ? (
                      <span style={{ color: 'green', fontSize: '12px' }}>returned</span>
                    ) : isOverdue ? (
                      <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 'bold' }}>OVERDUE</span>
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
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>my items ({myBooks.length})</h2>
      
      <p style={{ margin: '0 0 20px 0' }}>
        <Link href={`/libraries/${libraryId}/books/new`} style={{ color: 'blue' }}>+ add an item</Link>
      </p>

      {myBooks.length === 0 ? (
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>you haven&apos;t added any items yet</p>
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
      <LibraryPageContainer>
        loading library...
      </LibraryPageContainer>
    );
  }

  if (error) {
    return (
      <LibraryPageContainer>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>error</h1>
        <p style={{ margin: '0 0 20px 0', color: 'red' }}>{error}</p>
        <p>
          <Link href="/" style={{ color: 'blue' }}>&larr; back to home</Link>
        </p>
      </LibraryPageContainer>
    );
  }

  if (!library) {
    return (
      <LibraryPageContainer>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>library not found</h1>
        <p>
          <Link href="/" style={{ color: 'blue' }}>&larr; back to home</Link>
        </p>
      </LibraryPageContainer>
    );
  }

  return (
    <LibraryPageContainer>
      <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>{library.name}</h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        {library.description || 'no description'}
      </p>
      
      {/* Overdue books warning */}
      {isAuthenticated && overdueCount > 0 && (
        <div style={{ 
          margin: '0 0 20px 0', 
          padding: '10px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca',
          borderRadius: '4px'
        }}>
          <strong style={{ color: '#dc2626' }}>
            ⚠️ You have {overdueCount} overdue items{overdueCount > 1 ? 's' : ''}!
          </strong>
          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
            Check the &ldquo;My Borrowed&rdquo; tab to see details.
          </span>
        </div>
      )}
      
      <p style={{ margin: '0 0 20px 0' }}>
        <Link href="/" style={{ color: 'blue' }}>&larr; back to home</Link>
        {auth?.isSuper && (
          <>
            {' • '}
            <Link href={`/libraries/${libraryId}/edit`} style={{ color: 'blue' }}>edit library</Link>
          </>
        )}
      </p>

      <LibraryAuthStatus libraryId={libraryId} libraryName={library.name} />

      {/* Library info section */}
      <LibrarySectionDivider />
      
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

      <LibrarySectionDivider />

      {/* Tab Navigation */}
      {renderTabButtons()}

      {/* Tab Content */}
      {renderActiveTab()}

    </LibraryPageContainer>
  );
}
