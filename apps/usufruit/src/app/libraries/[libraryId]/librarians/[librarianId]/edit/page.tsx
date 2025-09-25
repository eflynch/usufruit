'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Librarian } from '@usufruit/models';
import { LibraryPageContainer, BackToLibraryLink, LibrarySectionDivider } from '../../../../../../components/LibraryPageComponents';
import { useLibraryAuth } from '../../../../../../utils/auth-hooks';

export default function EditLibrarianPage() {
  const params = useParams();
  const router = useRouter();
  const libraryId = params?.libraryId as string;
  const librarianId = params?.librarianId as string;
  
  const [librarian, setLibrarian] = useState<Librarian | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'reassign' | 'deleteAll'>('reassign');
  const [reassignTo, setReassignTo] = useState('');
  const [availableLibrarians, setAvailableLibrarians] = useState<Librarian[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    contactInfo: ''
  });

  const { auth, authHeaders } = useLibraryAuth(libraryId);

  useEffect(() => {
    if (!libraryId || !librarianId) return;

    const fetchLibrarian = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/libraries/${libraryId}/librarians/${librarianId}`, {
          headers: authHeaders,
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Librarian not found');
          }
          throw new Error('Failed to fetch librarian');
        }
        
        const librarianData = await response.json();
        setLibrarian(librarianData);
        setFormData({
          name: librarianData.name || '',
          contactInfo: librarianData.contactInfo || ''
        });

        // Fetch all librarians for reassignment option (only if user is super)
        if (auth?.isSuper) {
          const librariansResponse = await fetch(`/api/libraries/${libraryId}/librarians`, {
            headers: authHeaders,
          });
          
          if (librariansResponse.ok) {
            const allLibrarians = await librariansResponse.json();
            // Filter out the current librarian
            const others = allLibrarians.filter((l: Librarian) => l.id !== librarianId);
            setAvailableLibrarians(others);
            if (others.length > 0) {
              setReassignTo(others[0].id);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLibrarian();
  }, [libraryId, librarianId, authHeaders, auth?.isSuper]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth || !librarian) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/libraries/${libraryId}/librarians/${librarianId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          name: formData.name,
          contactInfo: formData.contactInfo
        }),
      });

      if (response.ok) {
        setSaveMessage('Librarian details updated successfully!');
        setTimeout(() => {
          router.push(`/libraries/${libraryId}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || 'Failed to update librarian'}`);
      }
    } catch {
      setSaveMessage('Error: Failed to update librarian');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDelete = async () => {
    if (!auth?.isSuper) {
      setSaveMessage('Error: Only super librarians can delete librarians');
      return;
    }

    try {
      setDeleting(true);
      setSaveMessage(null);

      const queryParams = new URLSearchParams();
      if (deleteOption === 'reassign' && reassignTo) {
        queryParams.append('reassignBooksTo', reassignTo);
      } else if (deleteOption === 'deleteAll') {
        queryParams.append('deleteBooksAndLoans', 'true');
      }

      const url = `/api/libraries/${libraryId}/librarians/${librarianId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: authHeaders
      });

      if (response.ok) {
        setSaveMessage('Librarian deleted successfully! Redirecting...');
        setTimeout(() => {
          router.push(`/libraries/${libraryId}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || 'Failed to delete librarian'}`);
      }
    } catch {
      setSaveMessage('Error: Failed to delete librarian');
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

  if (!librarian) {
    return (
      <LibraryPageContainer>
        <h1>librarian not found</h1>
        <BackToLibraryLink libraryId={libraryId} />
      </LibraryPageContainer>
    );
  }

  // Check authorization
  if (!auth || (!auth.isSuper && auth.id !== librarianId)) {
    return (
      <LibraryPageContainer>
        <h1>access denied</h1>
        <p style={{ margin: '0 0 20px 0', color: 'red' }}>
          You can only edit your own details, or be a super librarian.
        </p>
        <BackToLibraryLink libraryId={libraryId} />
      </LibraryPageContainer>
    );
  }

  const isEditingSelf = auth.id === librarianId;

  return (
    <LibraryPageContainer>
      <h1>edit librarian{isEditingSelf ? ' (your details)' : ` - ${librarian.name}`}</h1>
      
      <BackToLibraryLink libraryId={libraryId} />

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
                name
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
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
                contact info
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                <input
                  type="text"
                  value={formData.contactInfo}
                  onChange={(e) => handleInputChange('contactInfo', e.target.value)}
                  placeholder="email, phone, etc."
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
                role
              </td>
              <td style={{ padding: '8px', border: '1px solid #999' }}>
                {librarian.isSuper ? 'super librarian' : 'librarian'}
                {isEditingSelf && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Role changes must be done by a super librarian from the main library page.
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999', 
                fontWeight: 'bold'
              }}>
                library id
              </td>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #999',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#666'
              }}>
                {librarian.libraryId}
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

          {/* Only show delete button for super librarians and not editing self */}
          {auth?.isSuper && !isEditingSelf && (
            !showDeleteConfirm ? (
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
                delete librarian
              </button>
            ) : (
              <div style={{ display: 'inline-block', marginRight: '10px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#dc3545', fontSize: '14px', fontWeight: 'bold' }}>
                    Delete Librarian - Choose Option:
                  </span>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', marginRight: '15px' }}>
                    <input
                      type="radio"
                      name="deleteOption"
                      value="reassign"
                      checked={deleteOption === 'reassign'}
                      onChange={(e) => setDeleteOption(e.target.value as 'reassign')}
                      style={{ marginRight: '5px' }}
                    />
                    Reassign books/loans to:
                  </label>
                  
                  {deleteOption === 'reassign' && (
                    <select
                      value={reassignTo}
                      onChange={(e) => setReassignTo(e.target.value)}
                      style={{
                        fontSize: '12px',
                        padding: '2px 4px',
                        marginRight: '10px'
                      }}
                    >
                      {availableLibrarians.map(lib => (
                        <option key={lib.id} value={lib.id}>
                          {lib.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px' }}>
                    <input
                      type="radio"
                      name="deleteOption"
                      value="deleteAll"
                      checked={deleteOption === 'deleteAll'}
                      onChange={(e) => setDeleteOption(e.target.value as 'deleteAll')}
                      style={{ marginRight: '5px' }}
                    />
                    Delete all books and loans permanently
                  </label>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={deleting || (deleteOption === 'reassign' && (!reassignTo || availableLibrarians.length === 0))}
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
                    {deleting ? 'deleting...' : 'confirm delete'}
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
              </div>
            )
          )}
          
          <Link href={`/libraries/${libraryId}`} style={{ 
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
