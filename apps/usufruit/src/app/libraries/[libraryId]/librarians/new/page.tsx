'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LibraryAuthStatus from '../../../../../components/LibraryAuthStatus';
import { LibraryPageContainer, BackToLibraryLink, LibrarySectionDivider } from '../../../../../components/LibraryPageComponents';
import { useLibraryAuth } from '../../../../../utils/auth-hooks';

export default function NewLibrarianPage() {
  const params = useParams();
  const libraryId = params?.libraryId as string;
  const { auth, authHeaders } = useLibraryAuth(libraryId);
  
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSuper, setIsSuper] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ 
    name: string; 
    secretKey: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!contactInfo.trim()) {
      setError('Contact info is required');
      return;
    }

    if (!auth || !auth.isSuper) {
      setError('You must be a super librarian to add librarians');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/libraries/${libraryId}/librarians`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          name: name.trim(),
          contactInfo: contactInfo.trim(),
          isSuper,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create librarian');
      }

      const result = await response.json();
      
      setSuccess({
        name: result.name,
        secretKey: result.secretKey,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!auth) {
    return (
      <LibraryPageContainer>
        <h1>add librarian</h1>
        
        <BackToLibraryLink libraryId={libraryId} />

        <LibraryAuthStatus libraryId={libraryId} />
        
        <p style={{ margin: '20px 0 0 0', color: '#666' }}>
          You need to be logged in as a super librarian to add librarians.
        </p>
      </LibraryPageContainer>
    );
  }

  if (!auth.isSuper) {
    return (
      <LibraryPageContainer>
        <h1>add librarian</h1>
        
        <BackToLibraryLink libraryId={libraryId} />

        <LibraryAuthStatus libraryId={libraryId} />
        
        <p style={{ margin: '20px 0 0 0', color: '#666' }}>
          Only super librarians can add new librarians to this library.
        </p>
      </LibraryPageContainer>
    );
  }

  if (success) {
    return (
      <LibraryPageContainer>
        <h1>librarian added!</h1>
        
        <BackToLibraryLink libraryId={libraryId} />

        <LibraryAuthStatus libraryId={libraryId} />

        <LibrarySectionDivider />
        
        <h2 style={{ fontSize: '18px', margin: '0 0 10px 0', color: 'red' }}>important: share this secret key</h2>
        <div style={{ 
          background: '#f5f5f5', 
          border: '1px solid #999', 
          padding: '10px', 
          margin: '0 0 15px 0',
          fontFamily: 'monospace',
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
            librarian: {success.name}
          </p>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
            secret key: <span style={{ background: '#fff', padding: '2px 4px' }}>{success.secretKey}</span>
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            send this secret key to {success.name} so they can log in. keep it safe!
          </p>
        </div>
        
        <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>next steps</h2>
        <ul style={{ margin: '0 0 15px 20px', padding: '0' }}>
          <li>share the secret key with {success.name}</li>
          <li>they can use it to <Link href="/auth" style={{ color: 'blue' }}>log in</Link></li>
          <li><Link href={`/libraries/${libraryId}`} style={{ color: 'blue' }}>view library</Link></li>
          <li><Link href={`/libraries/${libraryId}/librarians/new`} style={{ color: 'blue' }}>add another librarian</Link></li>
        </ul>
      </LibraryPageContainer>
    );
  }

  return (
    <LibraryPageContainer>
      <h1>add librarian</h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        add a new librarian to this library
      </p>
      
      <BackToLibraryLink libraryId={libraryId} />

      <LibraryAuthStatus libraryId={libraryId} />

      <LibrarySectionDivider />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="librarian's name"
            style={{
              width: '100%',
              maxWidth: '300px',
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
            contact info *
          </label>
          <input
            type="text"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="email, phone, social media, etc."
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '4px 6px',
              border: '1px solid #999',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
            disabled={isSubmitting}
            required
          />
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
            any way to reach them - email, phone, social media handle, etc.
          </p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isSuper}
              onChange={(e) => setIsSuper(e.target.checked)}
              style={{ marginRight: '8px' }}
              disabled={isSubmitting}
            />
            make this person a super librarian
          </label>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
            super librarians can add/remove other librarians and change library settings
          </p>
        </div>

        {error && (
          <p style={{ color: 'red', margin: '0 0 15px 0' }}>
            error: {error}
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
          }}
        >
          {isSubmitting ? 'adding librarian...' : 'add librarian'}
        </button>
      </form>
    </LibraryPageContainer>
  );
}
