'use client';

import { useState } from 'react';
import Link from 'next/link';
import { saveLibraryToStorage } from '../../utils/saved-libraries';
import { saveAuthenticatedLibrarian, clearAuthenticatedLibrarian } from '../../utils/auth';
import { Librarian, Library } from '@usufruit/models';

export default function Auth() {
  const [secretKey, setSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ librarian: Librarian; library: Library } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      setError('secret key is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretKey: secretKey.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'authentication failed');
      }

      const authData = await response.json();
      
      // Save library to localStorage
      if (authData.data.librarian.library) {
        saveLibraryToStorage({
          id: authData.data.librarian.library.id,
          name: authData.data.librarian.library.name,
        });
      }

      // Save authenticated librarian to localStorage
      saveAuthenticatedLibrarian({
        id: authData.data.librarian.id,
        name: authData.data.librarian.name,
        contactInfo: authData.data.librarian.contactInfo,
        isSuper: authData.data.librarian.isSuper,
        secretKey: authData.data.librarian.secretKey,
        library: authData.data.librarian.library,
      });

      setSuccess({
        librarian: authData.data.librarian,
        library: authData.data.librarian.library,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        lineHeight: '1.4',
        margin: '20px',
        maxWidth: '800px'
      }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>welcome back!</h1>
        <p style={{ margin: '0 0 20px 0', color: '#666' }}>
          logged in as {success.librarian.name}
          {success.librarian.isSuper && ' (super librarian)'}
        </p>
        
        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
        
        <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>library: {success.library.name}</h2>
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>
          {success.library.description || 'no description'}
        </p>
        
        <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>what would you like to do?</h2>
        <ul style={{ margin: '0 0 15px 20px', padding: '0' }}>
          <li><Link href={`/libraries/${success.library.id}`} style={{ color: 'blue' }}>view library</Link></li>
          <li><Link href={`/libraries/${success.library.id}/books`} style={{ color: 'blue' }}>browse items</Link></li>
          <li><Link href={`/libraries/${success.library.id}/books/new`} style={{ color: 'blue' }}>add an item</Link></li>
          {success.librarian.isSuper && (
            <>
              <li><Link href={`/libraries/${success.library.id}/librarians`} style={{ color: 'blue' }}>manage librarians</Link></li>
              <li><Link href={`/libraries/${success.library.id}/librarians/new`} style={{ color: 'blue' }}>add librarian</Link></li>
            </>
          )}
        </ul>
        
        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
        
        <button
          onClick={() => {
            clearAuthenticatedLibrarian(success.library.id);
            setSuccess(null);
            setSecretKey('');
          }}
          style={{
            padding: '6px 12px',
            border: '1px solid #999',
            background: '#f0f0f0',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            color: 'red',
            marginBottom: '20px',
          }}
        >
          log out
        </button>
        
        <p style={{ margin: '20px 0 0 0' }}>
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
      <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>log in as librarian</h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        enter your secret key to access your library
      </p>
      
      <p style={{ margin: '0 0 20px 0' }}>
        <Link href="/" style={{ color: 'blue' }}>&larr; back to home</Link>
      </p>
      
      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            secret key
          </label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="enter your secret key"
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '4px 6px',
              border: '1px solid #999',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
            disabled={isSubmitting}
          />
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
            this was provided when you were added as a librarian
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
          {isSubmitting ? 'logging in...' : 'log in'}
        </button>
      </form>
      
      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
      
      <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>don&apos;t have a secret key?</h2>
      <p style={{ margin: '0 0 15px 0' }}>
        ask a super librarian from your library to add you as a librarian.
        they can generate a secret key for you.
      </p>
      <p style={{ margin: '0 0 15px 0' }}>
        or <Link href="/libraries/new" style={{ color: 'blue' }}>create a new library</Link> and 
        become the first librarian.
      </p>
    </div>
  );
}
