'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Book, Librarian } from '@usufruit/models';
import { LibraryPageContainer, BackToLibraryLink, LibrarySectionDivider } from '../../../../../../components/LibraryPageComponents';
import { useLibraryAuth } from '../../../../../../utils/auth-hooks';

export default function EditBookPage() {
  const params = useParams();
  const router = useRouter();
  const libraryId = params?.libraryId as string;
  const bookId = params?.bookId as string;
  
  const [book, setBook] = useState<Book | null>(null);
  const [librarians, setLibrarians] = useState<Librarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    borrowDurationDays: 14,
    organizingRules: '',
    checkInInstructions: '',
    checkOutInstructions: '',
    librarianId: ''
  });

  const { auth, isAuthenticated, authHeaders } = useLibraryAuth(libraryId);

  useEffect(() => {
    if (!libraryId || !bookId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch book details
        const bookResponse = await fetch(`/api/libraries/${libraryId}/books/${bookId}`);
        if (!bookResponse.ok) {
          if (bookResponse.status === 404) {
            throw new Error('Item not found');
          }
          throw new Error('Failed to fetch item');
        }
        const bookData = await bookResponse.json();
        setBook(bookData);
        setFormData({
          title: bookData.title || '',
          author: bookData.author || '',
          description: bookData.description || '',
          borrowDurationDays: bookData.borrowDurationDays || 14,
          organizingRules: bookData.organizingRules || '',
          checkInInstructions: bookData.checkInInstructions || '',
          checkOutInstructions: bookData.checkOutInstructions || '',
          librarianId: bookData.librarianId || ''
        });

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

    fetchData();
  }, [libraryId, bookId, isAuthenticated, authHeaders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth || !book) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/libraries/${libraryId}/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSaveMessage('Book updated successfully!');
        setTimeout(() => {
          router.push(`/libraries/${libraryId}/books/${bookId}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || 'Failed to update book'}`);
      }
    } catch {
      setSaveMessage('Error: Failed to update book');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'borrowDurationDays' ? parseInt(value) || 1 : value
    }));
  };

  const handleDelete = async () => {
    if (!isAuthenticated) {
      setSaveMessage('Error: You must be logged in to delete books');
      return;
    }

    try {
      setDeleting(true);
      setSaveMessage(null);

      const response = await fetch(`/api/libraries/${libraryId}/books/${bookId}`, {
        method: 'DELETE',
        headers: authHeaders
      });

      if (response.ok) {
        setSaveMessage('Book deleted successfully! Redirecting...');
        setTimeout(() => {
          router.push(`/libraries/${libraryId}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || 'Failed to delete book'}`);
      }
    } catch {
      setSaveMessage('Error: Failed to delete book');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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
        <h1>item not found</h1>
        <BackToLibraryLink libraryId={libraryId} />
      </LibraryPageContainer>
    );
  }

  // Check authorization
  if (!auth || (!auth.isSuper && auth.id !== book.librarianId)) {
    return (
      <LibraryPageContainer>
        <h1>access denied</h1>
        <p style={{ margin: '0 0 20px 0', color: 'red' }}>
          You can only edit your own books, or be a super librarian.
        </p>
        <BackToLibraryLink libraryId={libraryId} />
      </LibraryPageContainer>
    );
  }

  return (
    <LibraryPageContainer>
      <h1>edit item</h1>
      
      <p style={{ margin: '0 0 20px 0' }}>
        <Link href={`/libraries/${libraryId}/books/${bookId}`} style={{ color: 'blue' }}>
          ← back to item 
        </Link>
      </p>

      <LibrarySectionDivider />

      <form onSubmit={handleSubmit}>
        <table style={{ width: '100%', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold',
                width: '150px'
              }}>
                title
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #999',
                    fontFamily: 'inherit',
                    fontSize: 'inherit'
                  }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold'
              }}>
                author
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #999',
                    fontFamily: 'inherit',
                    fontSize: 'inherit'
                  }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold'
              }}>
                description
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #999',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold'
              }}>
                borrow duration (days)
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <input
                  type="number"
                  value={formData.borrowDurationDays}
                  onChange={(e) => handleInputChange('borrowDurationDays', e.target.value)}
                  min="1"
                  max="365"
                  required
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #999',
                    fontFamily: 'inherit',
                    fontSize: 'inherit'
                  }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold'
              }}>
                organizing rules
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <textarea
                  value={formData.organizingRules}
                  onChange={(e) => handleInputChange('organizingRules', e.target.value)}
                  rows={2}
                  placeholder="How should this book be organized/shelved?"
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #999',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold'
              }}>
                check-in instructions
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <textarea
                  value={formData.checkInInstructions}
                  onChange={(e) => handleInputChange('checkInInstructions', e.target.value)}
                  rows={2}
                  placeholder="Instructions for when book is returned"
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #999',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold'
              }}>
                check-out instructions
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <textarea
                  value={formData.checkOutInstructions}
                  onChange={(e) => handleInputChange('checkOutInstructions', e.target.value)}
                  rows={2}
                  placeholder="Instructions for when book is borrowed"
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #999',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold'
              }}>
                assigned librarian
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <select
                  value={formData.librarianId}
                  onChange={(e) => handleInputChange('librarianId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #999',
                    fontFamily: 'inherit',
                    fontSize: 'inherit'
                  }}
                >
                  <option value="">— no assigned librarian —</option>
                  {librarians.map((librarian) => (
                    <option key={librarian.id} value={librarian.id}>
                      {librarian.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: '20px' }}>
          <button
            type="submit"
            disabled={saving || deleting}
            style={{
              padding: '8px 16px',
              background: saving ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontFamily: 'inherit',
              marginRight: '10px'
            }}
          >
            {saving ? 'saving...' : 'save changes'}
          </button>
          
          {!showDeleteConfirm ? (
            <button
              type="button"
              disabled={saving || deleting}
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                cursor: (saving || deleting) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontFamily: 'inherit',
                marginRight: '10px'
              }}
            >
              delete book
            </button>
          ) : (
            <div style={{ display: 'inline-block', marginRight: '10px' }}>
              <span style={{ 
                color: '#dc3545', 
                fontSize: '14px', 
                marginRight: '8px' 
              }}>
                Are you sure?
              </span>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                style={{
                  padding: '6px 12px',
                  background: deleting ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  marginRight: '5px'
                }}
              >
                {deleting ? 'deleting...' : 'yes, delete'}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '6px 12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontFamily: 'inherit'
                }}
              >
                cancel
              </button>
            </div>
          )}
          
          <Link href={`/libraries/${libraryId}/books/${bookId}`} style={{ 
            color: '#666',
            textDecoration: 'none',
            padding: '8px 16px',
            border: '1px solid #999',
            display: 'inline-block'
          }}>
            cancel
          </Link>
        </div>

        {saveMessage && (
          <div style={{ 
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: saveMessage.includes('Error') ? '#f8d7da' : '#d4edda',
            border: `1px solid ${saveMessage.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
            color: saveMessage.includes('Error') ? '#721c24' : '#155724'
          }}>
            {saveMessage}
          </div>
        )}
      </form>
    </LibraryPageContainer>
  );
}
