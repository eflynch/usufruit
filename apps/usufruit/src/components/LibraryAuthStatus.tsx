'use client';

import Link from 'next/link';
import { clearAuthenticatedLibrarian } from '../utils/auth';
import { useLibraryAuth } from '../utils/auth-hooks';

interface LibraryAuthStatusProps {
  libraryId: string;
  libraryName?: string;
}

export default function LibraryAuthStatus({ libraryId, libraryName }: LibraryAuthStatusProps) {
  const { auth, isLoading, refresh } = useLibraryAuth(libraryId);

  const handleLogout = () => {
    clearAuthenticatedLibrarian(libraryId);
    refresh(); // Refresh the auth state
  };

  if (isLoading) {
    return null; // Don't show anything while loading to avoid hydration issues
  }

  if (!auth) {
    return (
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffeaa7', 
        padding: '10px', 
        margin: '0 0 20px 0' 
      }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>not logged in to this library</p>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
          you need to log in as a librarian to view full details or make changes
        </p>
        <Link href="/auth" style={{ color: 'blue' }}>log in as librarian</Link>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#d4edda', 
      border: '1px solid #c3e6cb', 
      padding: '10px', 
      margin: '0 0 20px 0' 
    }}>
      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
        logged in as {auth.name}
        {auth.isSuper && ' (super librarian)'}
      </p>
      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
        library: {libraryName || auth.library.name}
      </p>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/" style={{ color: 'blue', fontSize: '12px' }}>
          my libraries
        </Link>
        <button
          onClick={handleLogout}
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
          log out of this library
        </button>
      </div>
    </div>
  );
}
