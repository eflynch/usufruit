'use client';

import { useState } from 'react';
import Link from 'next/link';
import { saveLibraryToStorage } from '../../../utils/saved-libraries';
import { saveAuthenticatedLibrarian } from '../../../utils/auth';

export default function NewLibrary() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [librarianName, setLibrarianName] = useState('');
  const [librarianEmail, setLibrarianEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ 
    library: { id: string; name: string }; 
    librarian: { id: string; name: string; secretKey: string };
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('library name is required');
      return;
    }
    if (!librarianName.trim()) {
      setError('your name is required');
      return;
    }
    if (!librarianEmail.trim()) {
      setError('your contact info is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/libraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          firstLibrarian: {
            name: librarianName.trim(),
            email: librarianEmail.trim(),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'failed to create library');
      }

      const result = await response.json();
      
      // Save to localStorage
      saveLibraryToStorage({
        id: result.data.library.id,
        name: result.data.library.name,
      });

      // Save authenticated librarian
      saveAuthenticatedLibrarian({
        id: result.data.librarian.id,
        name: result.data.librarian.name,
        contactInfo: result.data.librarian.contactInfo,
        isSuper: result.data.librarian.isSuper,
        secretKey: result.data.librarian.secretKey,
        library: result.data.library,
      });

      setSuccess({
        library: {
          id: result.data.library.id,
          name: result.data.library.name,
        },
        librarian: {
          id: result.data.librarian.id,
          name: result.data.librarian.name,
          secretKey: result.data.librarian.secretKey,
        },
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
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>library created!</h1>
        <p style={{ margin: '0 0 20px 0', color: '#666' }}>
          your new library &quot;{success.library.name}&quot; has been created
        </p>
        
        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
        
        <h2 style={{ fontSize: '18px', margin: '0 0 10px 0', color: 'red' }}>important: save your secret key</h2>
        <div style={{ 
          background: '#f5f5f5', 
          border: '1px solid #999', 
          padding: '10px', 
          margin: '0 0 15px 0',
          fontFamily: 'monospace',
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
            your secret key: <span style={{ background: '#fff', padding: '2px 4px' }}>{success.librarian.secretKey}</span>
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            save this somewhere safe! you&apos;ll need it to log in as a super librarian.
          </p>
        </div>
        
        <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>next steps</h2>
        <ul style={{ margin: '0 0 15px 20px', padding: '0' }}>
          <li><Link href={`/libraries/${success.library.id}`} style={{ color: 'blue' }}>view your library</Link></li>
          <li><Link href={`/libraries/${success.library.id}/librarians/new`} style={{ color: 'blue' }}>add more librarians</Link></li>
          <li><Link href={`/libraries/${success.library.id}/books/new`} style={{ color: 'blue' }}>add books</Link></li>
          <li><Link href="/auth" style={{ color: 'blue' }}>log in with your secret key</Link></li>
          <li><Link href="/" style={{ color: 'blue' }}>go to home</Link></li>
        </ul>
        
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
      <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>create a new library</h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        set up a new community library
      </p>
      
      <p style={{ margin: '0 0 20px 0' }}>
        <Link href="/" style={{ color: 'blue' }}>&larr; back to home</Link>
      </p>
      
      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
      
      <form onSubmit={handleSubmit}>
        <h2 style={{ fontSize: '18px', margin: '0 0 15px 0' }}>library information</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            library name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mission District Library"
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
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. A community library for the Mission District"
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            location (optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. San Francisco, CA"
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
        </div>

        <h2 style={{ fontSize: '18px', margin: '20px 0 15px 0' }}>first librarian (you)</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            your name *
          </label>
          <input
            type="text"
            value={librarianName}
            onChange={(e) => setLibrarianName(e.target.value)}
            placeholder="e.g. Jane Smith"
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
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            your contact info *
          </label>
          <input
            type="text"
            value={librarianEmail}
            onChange={(e) => setLibrarianEmail(e.target.value)}
            placeholder="e.g. jane@example.com, 555-123-4567, @username"
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
            email, phone, social media, or other way to contact you. you will become the first super librarian.
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
          {isSubmitting ? 'creating...' : 'create library'}
        </button>
      </form>
    </div>
  );
}
