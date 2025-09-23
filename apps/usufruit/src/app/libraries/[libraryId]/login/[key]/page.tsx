'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveAuthenticatedLibrarian, type AuthenticatedLibrarian } from '../../../../../utils/auth';
import { useLibraryAuth } from '../../../../../utils/auth-hooks';

export default function LibrarianLoginPage() {
  const params = useParams();
  const router = useRouter();
  const libraryId = params?.libraryId as string;
  const key = params?.key as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [librarianName, setLibrarianName] = useState('');

  // Use the auth hook to check authentication status and refresh after login
  const { isAuthenticated, refresh: refreshAuth } = useLibraryAuth(libraryId);

  useEffect(() => {
    if (!libraryId || !key) {
      setStatus('error');
      setMessage('Invalid login link');
      return;
    }

    // If already authenticated for this library, redirect immediately
    if (isAuthenticated) {
      setStatus('success');
      setMessage('Already logged in! Redirecting...');
      setTimeout(() => {
        router.push(`/libraries/${libraryId}`);
      }, 1000);
      return;
    }

    const performLogin = async () => {
      try {
        const response = await fetch(`/api/libraries/${libraryId}/login/${key}`);
        const data = await response.json();

        if (response.ok && data.success) {
          // Store the authentication using existing auth utilities
          const authenticatedLibrarian: AuthenticatedLibrarian = {
            id: data.librarian.id,
            name: data.librarian.name,
            contactInfo: data.librarian.contactInfo,
            isSuper: data.librarian.isSuper,
            secretKey: key,
            library: {
              id: libraryId,
              name: data.librarian.library?.name || 'Library',
              description: data.librarian.library?.description
            }
          };
          
          // Use the existing auth utility to save
          saveAuthenticatedLibrarian(authenticatedLibrarian);
          
          // Refresh the auth state to ensure the hook picks up the new authentication
          refreshAuth();
          
          setStatus('success');
          setLibrarianName(data.librarian.name);
          setMessage('Successfully logged in! Redirecting...');
          
          // Redirect after a short delay
          setTimeout(() => {
            router.push(`/libraries/${libraryId}`);
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        setStatus('error');
        setMessage('Failed to connect to server');
      }
    };

    performLogin();
  }, [libraryId, key, router, refreshAuth, isAuthenticated]);

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      fontSize: '14px', 
      lineHeight: '1.4',
      margin: '20px',
      maxWidth: '600px'
    }}>
      <h1 style={{ fontSize: '24px', margin: '0 0 20px 0' }}>Librarian Login</h1>
      
      {status === 'loading' && (
        <div>
          <p>Authenticating...</p>
        </div>
      )}
      
      {status === 'success' && (
        <div style={{ color: '#38a169' }}>
          <p><strong>Welcome, {librarianName}!</strong></p>
          <p>{message}</p>
          <p style={{ marginTop: '20px' }}>
            <Link href={`/libraries/${libraryId}`} style={{ color: 'blue' }}>
              Continue to library →
            </Link>
          </p>
        </div>
      )}
      
      {status === 'error' && (
        <div style={{ color: '#e53e3e' }}>
          <p><strong>Login Failed</strong></p>
          <p>{message}</p>
          <p style={{ marginTop: '20px' }}>
            <Link href={`/libraries/${libraryId}`} style={{ color: 'blue' }}>
              Go to library page
            </Link>
            {' | '}
            <Link href="/" style={{ color: 'blue' }}>
              Back to home
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
