'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Book, Loan } from '@usufruit/models';
import LibraryAuthStatus from '../../../../../components/LibraryAuthStatus';
import { useLibraryAuth } from '../../../../../utils/auth-hooks';

export default function BookPage() {
  const params = useParams();
  const libraryId = params?.libraryId as string;
  const bookId = params?.bookId as string;
  
  const [book, setBook] = useState<Book | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <Link href={`/libraries/${libraryId}`} style={{ color: 'blue' }}>&larr; back to library</Link>
        </p>
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        margin: '20px',
        maxWidth: '800px'
      }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>book not found</h1>
        <p>
          <Link href={`/libraries/${libraryId}`} style={{ color: 'blue' }}>&larr; back to library</Link>
        </p>
      </div>
    );
  }

  const currentLoan = loans.find(loan => !loan.returnedAt);

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      fontSize: '14px', 
      lineHeight: '1.4',
      margin: '20px',
      maxWidth: '800px'
    }}>
      <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>{book.title}</h1>
      {book.author && (
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '16px' }}>
          by {book.author}
        </p>
      )}
      
      <p style={{ margin: '0 0 20px 0' }}>
        <Link href={`/libraries/${libraryId}`} style={{ color: 'blue' }}>&larr; back to library</Link>
      </p>

      <LibraryAuthStatus libraryId={libraryId} />

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />

      {/* Book Status */}
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>availability</h2>
      <div style={{ 
        background: currentLoan ? '#fff3cd' : '#d4edda', 
        border: `1px solid ${currentLoan ? '#ffeaa7' : '#c3e6cb'}`, 
        padding: '10px', 
        margin: '0 0 20px 0' 
      }}>
        {currentLoan ? (
          <p style={{ margin: '0', fontWeight: 'bold' }}>
            currently checked out
            {currentLoan.dueDate && (
              <span style={{ fontWeight: 'normal' }}>
                {' '}(due {new Date(currentLoan.dueDate).toLocaleDateString()})
              </span>
            )}
          </p>
        ) : (
          <p style={{ margin: '0', fontWeight: 'bold', color: 'green' }}>
            available for checkout
          </p>
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
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>author</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999' }}>{book.author || '—'}</td>
          </tr>
          {book.description && (
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>description</td>
              <td style={{ padding: '4px 8px', border: '1px solid #999' }}>{book.description}</td>
            </tr>
          )}
          <tr>
            <td style={{ padding: '4px 8px', border: '1px solid #999', fontWeight: 'bold' }}>added</td>
            <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
              {new Date(book.createdAt).toLocaleDateString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Instructions */}
      {(book.organizingRules || book.checkInInstructions || book.checkOutInstructions) && (
        <>
          <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>instructions</h2>
          <table style={{ width: '100%', marginBottom: '20px' }}>
            <tbody>
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
        </>
      )}

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
    </div>
  );
}
