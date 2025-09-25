'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LibraryAuthStatus from '../../../../../components/LibraryAuthStatus';
import { LibraryPageContainer, BackToLibraryLink, LibrarySectionDivider } from '../../../../../components/LibraryPageComponents';
import { useLibraryAuth } from '../../../../../utils/auth-hooks';

export default function NewBookPage() {
  const params = useParams();
  const router = useRouter();
  const libraryId = params?.libraryId as string;
  
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [borrowDurationDays, setBorrowDurationDays] = useState(14);
  const [organizingRules, setOrganizingRules] = useState('');
  const [checkInInstructions, setCheckInInstructions] = useState('');
  const [checkOutInstructions, setCheckOutInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { auth, authHeaders } = useLibraryAuth(libraryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!auth) {
      setError('You must be logged in to add books');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/libraries/${libraryId}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim() || undefined,
          description: description.trim() || undefined,
          borrowDurationDays,
          organizingRules: organizingRules.trim() || undefined,
          checkInInstructions: checkInInstructions.trim() || undefined,
          checkOutInstructions: checkOutInstructions.trim() || undefined,
          librarianId: auth.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create item');
      }

      const result = await response.json();
      
      // Redirect to the new book page
      router.push(`/libraries/${libraryId}/books/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!auth) {
    return (
      <LibraryPageContainer>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>add book</h1>
        
        <BackToLibraryLink libraryId={libraryId} />

        <LibraryAuthStatus libraryId={libraryId} />
        
        <p style={{ margin: '20px 0 0 0', color: '#666' }}>
          You need to be logged in as a librarian to add books.
        </p>
      </LibraryPageContainer>
    );
  }

  return (
    <LibraryPageContainer>
      <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>add item</h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        add a new item to the library collection
      </p>
      
      <BackToLibraryLink libraryId={libraryId} />

      <LibraryAuthStatus libraryId={libraryId} />

      <LibrarySectionDivider />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="enter item title"
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
            description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="brief description of the item"
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
            borrow duration (days) *
          </label>
          <input
            type="number"
            value={borrowDurationDays}
            onChange={(e) => setBorrowDurationDays(parseInt(e.target.value) || 1)}
            min="1"
            max="365"
            style={{
              width: '100px',
              padding: '4px 6px',
              border: '1px solid #999',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
            disabled={isSubmitting}
            required
          />
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>
            how many days can this item be borrowed? (default: 14 days)
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
        
        <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>additional details (optional)</h2>
        <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '12px' }}>
          extra information and handling instructions
        </p>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
            author (if applicable)
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="author or creator name"
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

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            organizing rules
          </label>
          <textarea
            value={organizingRules}
            onChange={(e) => setOrganizingRules(e.target.value)}
            placeholder="where does this go on the shelf? how is it organized?"
            rows={2}
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
            check-out instructions
          </label>
          <textarea
            value={checkOutInstructions}
            onChange={(e) => setCheckOutInstructions(e.target.value)}
            placeholder="what should someone know when borrowing this?"
            rows={2}
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
            check-in instructions
          </label>
          <textarea
            value={checkInInstructions}
            onChange={(e) => setCheckInInstructions(e.target.value)}
            placeholder="what should someone know when returning this?"
            rows={2}
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
          {isSubmitting ? 'adding book...' : 'add book'}
        </button>
      </form>
    </LibraryPageContainer>
  );
}
