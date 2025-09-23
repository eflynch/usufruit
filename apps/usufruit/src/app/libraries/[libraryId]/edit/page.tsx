'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LibraryAuthStatus from '../../../../components/LibraryAuthStatus';
import { LibraryPageContainer, BackToLibraryLink, LibrarySectionDivider } from '../../../../components/LibraryPageComponents';
import { useLibraryAuth } from '../../../../utils/auth-hooks';

export default function EditLibraryPage() {
  const params = useParams();
  const router = useRouter();
  const libraryId = params?.libraryId as string;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { auth, authHeaders } = useLibraryAuth(libraryId);

  useEffect(() => {
    if (!libraryId) return;

    const fetchLibrary = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/libraries/${libraryId}`);
        if (response.ok) {
          const libraryData = await response.json();
          setName(libraryData.name || '');
          setDescription(libraryData.description || '');
          setLocation(libraryData.location || '');
        } else {
          setError('Failed to load library details');
        }
      } catch {
        setError('Failed to load library details');
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, [libraryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Library name is required');
      return;
    }

    if (!auth?.isSuper) {
      setError('Only super librarians can edit library details');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/libraries/${libraryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          location: location || undefined,
        }),
      });

      if (response.ok) {
        setSuccess('Library details updated successfully!');
        setTimeout(() => {
          router.push(`/libraries/${libraryId}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update library');
      }
    } catch {
      setError('Failed to update library');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <LibraryPageContainer>
        <h1>Edit Library</h1>
        <BackToLibraryLink libraryId={libraryId} />
        <p>Loading...</p>
      </LibraryPageContainer>
    );
  }

  if (!auth?.isSuper) {
    return (
      <LibraryPageContainer>
        <h1>Edit Library</h1>
        <BackToLibraryLink libraryId={libraryId} />
        <LibraryAuthStatus libraryId={libraryId} />
        <LibrarySectionDivider />
        <p style={{ color: '#666' }}>
          Only super librarians can edit library details.
        </p>
      </LibraryPageContainer>
    );
  }

  return (
    <LibraryPageContainer>
      <h1>Edit Library</h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        Update library information
      </p>
      
      <BackToLibraryLink libraryId={libraryId} />

      <LibraryAuthStatus libraryId={libraryId} />

      <LibrarySectionDivider />

      {success && (
        <div style={{ 
          background: '#d4edda', 
          border: '1px solid #c3e6cb', 
          padding: '10px', 
          margin: '0 0 20px 0',
          color: '#155724'
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Library Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '4px 6px',
              border: '1px solid #999',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
            disabled={isSubmitting}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '4px 6px',
              border: '1px solid #999',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              resize: 'vertical',
            }}
            disabled={isSubmitting}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Community Center, Building A"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '4px 6px',
              border: '1px solid #999',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <p style={{ color: 'red', margin: '0 0 15px 0' }}>
            Error: {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '6px 12px',
            border: '1px solid #999',
            background: isSubmitting ? '#ddd' : '#f0f0f0',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            marginRight: '10px',
          }}
        >
          {isSubmitting ? 'Updating...' : 'Update Library'}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/libraries/${libraryId}`)}
          disabled={isSubmitting}
          style={{
            padding: '6px 12px',
            border: '1px solid #999',
            background: '#f0f0f0',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        >
          Cancel
        </button>
      </form>
    </LibraryPageContainer>
  );
}
