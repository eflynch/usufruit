'use client';

import Link from 'next/link';
import { clearAuthenticatedLibrarian } from '../utils/auth';
import { useAllLibraryAuth } from '../utils/auth-hooks';

export default function AuthStatus() {
  const { auths, isLoading, refresh } = useAllLibraryAuth();

  const handleLogout = (libraryId: string) => {
    clearAuthenticatedLibrarian(libraryId);
    refresh(); // Refresh the auth state
  };

  if (isLoading) {
    return null; // Don't show anything while loading to avoid hydration issues
  }

  const authEntries = Object.values(auths);

  if (authEntries.length === 0) {
    return (
      <div style={{ 
        background: '#f5f5f5', 
        border: '1px solid #999', 
        padding: '10px', 
        margin: '0 0 20px 0' 
      }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>not logged in</p>
        <ul style={{ margin: '0 0 10px 20px', padding: '0' }}>
          <li><Link href="/auth" style={{ color: 'blue' }}>log in as librarian</Link></li>
          <li><Link href="/libraries/new" style={{ color: 'blue' }}>create a new library</Link></li>
        </ul>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#e8f5e8', 
      border: '1px solid #6a9c6a', 
      padding: '10px', 
      margin: '0 0 20px 0' 
    }}>
      <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
        logged in to {authEntries.length} librar{authEntries.length === 1 ? 'y' : 'ies'}
      </p>
      
      {authEntries.map((auth) => (
        <div key={auth.library.id} style={{ 
          background: '#f0f8f0', 
          border: '1px solid #ccc', 
          padding: '8px', 
          margin: '0 0 10px 0' 
        }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold' }}>
            {auth.library.name}
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#666' }}>
            as {auth.name}
            {auth.isSuper && ' (super librarian)'}
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href={`/libraries/${auth.library.id}`} style={{ color: 'blue', fontSize: '12px' }}>
              view library
            </Link>
            <button
              onClick={() => handleLogout(auth.library.id)}
              style={{
                padding: '2px 6px',
                border: '1px solid #999',
                background: '#f0f0f0',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '10px',
                color: 'red',
              }}
            >
              log out
            </button>
          </div>
        </div>
      ))}
      
      <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
        <Link href="/" style={{ color: 'blue' }}>view all my libraries</Link>
      </p>
    </div>
  );
}
