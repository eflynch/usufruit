'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Book, Loan } from '@usufruit/models';
import LibraryAuthStatus from '../../../../../components/LibraryAuthStatus';
import { LibraryPageContainer, BackToLibraryLink, LibrarySectionDivider } from '../../../../../components/LibraryPageComponents';
import { useLibraryAuth } from '../../../../../utils/auth-hooks';

export default function BookPage() {
  const params = useParams();
  const libraryId = params?.libraryId as string;
  const bookId = params?.bookId as string;
  
  const [book, setBook] = useState<Book | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [borrowMessage, setBorrowMessage] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [returnMessage, setReturnMessage] = useState<string | null>(null);

  const { auth, isAuthenticated, authHeaders } = useLibraryAuth(libraryId);

  useEffect(() => {
    if (!libraryId || !bookId) return;

    const fetchBookData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch book details
        const bookResponse = await fetch(`/api/libraries/${libraryId}/books/${bookId}`);
        if (!bookResponse.ok) {
          if (bookResponse.status === 404) {
            throw new Error('Book not found');
          }
          throw new Error('Failed to fetch book');
        }
        const bookData = await bookResponse.json();
        setBook(bookData);

        // Fetch loan history (only if authenticated)
        if (isAuthenticated) {
          const loansResponse = await fetch(`/api/libraries/${libraryId}/books/${bookId}/loans`, {
            headers: authHeaders,
          });
          if (loansResponse.ok) {
            const loansData = await loansResponse.json();
            setLoans(loansData);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBookData();
  }, [libraryId, bookId, isAuthenticated, authHeaders]);

  const handleBorrow = async () => {
    if (!auth || !book) return;

    setIsBorrowing(true);
    setBorrowMessage(null);

    try {
      const response = await fetch(`/api/libraries/${libraryId}/books/${bookId}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          librarianId: auth.id,
        }),
      });

      if (response.ok) {
        setBorrowMessage('Successfully borrowed! Refreshing...');
        // Refresh the book data to show updated loan status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const errorData = await response.json();
        setBorrowMessage(`Error: ${errorData.error || 'Failed to borrow item'}`);
      }
    } catch {
      setBorrowMessage('Error: Failed to borrow item');
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleReturn = async () => {
    if (!auth || !book || !currentLoan) return;

    setIsReturning(true);
    setReturnMessage(null);

    try {
      const response = await fetch(`/api/libraries/${libraryId}/books/${bookId}/loans`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          action: 'return',
          loanId: currentLoan.id,
          librarianId: auth.id,
        }),
      });

      if (response.ok) {
        setReturnMessage('Successfully returned! Refreshing...');
        // Refresh the book data to show updated loan status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const errorData = await response.json();
        setReturnMessage(`Error: ${errorData.error || 'Failed to return item'}`);
      }
    } catch {
      setReturnMessage('Error: Failed to return item');
    } finally {
      setIsReturning(false);
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
        loading book...
      </div>
    );
  }

  if (loading) {
    return (
      <LibraryPageContainer>
        <h1>loading...</h1>
        <BackToLibraryLink libraryId={libraryId} />
      </LibraryPageContainer>
    );
  }

  if (error) {
    return (
      <LibraryPageContainer>
        <h1>error</h1>
        <p style={{ margin: '0 0 20px 0', color: 'red' }}>{error}</p>
        <BackToLibraryLink libraryId={libraryId} />
      </LibraryPageContainer>
    );
  }

  if (!book) {
    return (
      <LibraryPageContainer>
        <h1>book not found</h1>
        <BackToLibraryLink libraryId={libraryId} />
      </LibraryPageContainer>
    );
  }

  const currentLoan = loans.find(loan => !loan.returnedAt);

  return (
    <LibraryPageContainer>
      <h1>{book.title}</h1>
      
      <BackToLibraryLink libraryId={libraryId} />
      {(auth?.isSuper || auth?.id === book.librarianId) && (
        <p style={{ margin: '10px 0' }}>
          <Link href={`/libraries/${libraryId}/books/${bookId}/edit`} style={{ color: 'blue' }}>
            edit book
          </Link>
        </p>
      )}

      <LibraryAuthStatus libraryId={libraryId} />

      <LibrarySectionDivider />

      {/* Book Status */}
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>availability</h2>
      <div style={{ 
        background: currentLoan ? '#fff3cd' : '#d4edda', 
        border: `1px solid ${currentLoan ? '#ffeaa7' : '#c3e6cb'}`, 
        padding: '10px', 
        margin: '0 0 20px 0' 
      }}>
        {currentLoan ? (
          <>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
              currently checked out
              {currentLoan.dueDate && (
                <span style={{ fontWeight: 'normal' }}>
                  {' '}(due {new Date(currentLoan.dueDate).toLocaleDateString()})
                </span>
              )}
            </p>
            {isAuthenticated && (
              <div>
                <button
                  onClick={handleReturn}
                  disabled={isReturning}
                  style={{
                    padding: '8px 16px',
                    background: isReturning ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    cursor: isReturning ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    marginRight: '10px',
                  }}
                >
                  {isReturning ? 'returning...' : 'return this item'}
                </button>
                {returnMessage && (
                  <span style={{ 
                    color: returnMessage.includes('Error') ? 'red' : 'green',
                    fontSize: '12px'
                  }}>
                    {returnMessage}
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: 'green' }}>
              available for checkout
            </p>
            {isAuthenticated && (
              <div>
                <button
                  onClick={handleBorrow}
                  disabled={isBorrowing}
                  style={{
                    padding: '8px 16px',
                    background: isBorrowing ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    cursor: isBorrowing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    marginRight: '10px',
                  }}
                >
                  {isBorrowing ? 'borrowing...' : 'borrow this item'}
                </button>
                {borrowMessage && (
                  <span style={{ 
                    color: borrowMessage.includes('Error') ? 'red' : 'green',
                    fontSize: '12px'
                  }}>
                    {borrowMessage}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Book Details */}
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>details</h2>
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>title</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999' }}>{book.title}</td>
          </tr>
          {book.description && (
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>description</td>
              <td style={{ padding: '4px 8px', border: '1px solid #999' }}>{book.description}</td>
            </tr>
          )}
          {book.author && (
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>author</td>
              <td style={{ padding: '4px 8px', border: '1px solid #999' }}>{book.author}</td>
            </tr>
          )}
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>borrow duration</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
              {book.borrowDurationDays} day{book.borrowDurationDays !== 1 ? 's' : ''}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>added</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
              {new Date(book.createdAt).toLocaleDateString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Instructions */}
      <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>instructions & contact</h2>
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>contact librarian</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
              {book.librarian?.name || '—'}
              {book.librarian?.contactInfo && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {book.librarian.contactInfo}
                </div>
              )}
            </td>
          </tr>
          {book.organizingRules && (
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>organizing</td>
              <td style={{ padding: '4px 8px', border: '1px solid #999' }}>{book.organizingRules}</td>
            </tr>
          )}
          {book.checkOutInstructions && (
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>check out</td>
              <td style={{ padding: '4px 8px', border: '1px solid #999' }}>{book.checkOutInstructions}</td>
            </tr>
          )}
          {book.checkInInstructions && (
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>check in</td>
              <td style={{ padding: '4px 8px', border: '1px solid #999' }}>{book.checkInInstructions}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Loan History - only show if authenticated */}
      {auth && loans.length > 0 && (
        <>
          <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>loan history</h2>
          <table style={{ width: '100%', marginBottom: '20px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>borrowed</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>due date</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>returned</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {new Date(loan.borrowedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    {loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                    <span style={{ 
                      color: loan.returnedAt ? 'green' : 'orange',
                      fontSize: '12px'
                    }}>
                      {loan.returnedAt ? 'returned' : 'checked out'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </LibraryPageContainer>
  );
}
