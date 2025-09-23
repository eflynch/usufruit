'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getSavedLibraries, 
  removeLibraryFromStorage, 
  clearAllSavedLibraries,
  type SavedLibrary 
} from '../utils/saved-libraries';
import { useAllLibraryAuth } from '../utils/auth-hooks';

export default function Home() {
  const [savedLibraries, setSavedLibraries] = useState<SavedLibrary[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { auths } = useAllLibraryAuth();

  useEffect(() => {
    setSavedLibraries(getSavedLibraries());
    setIsLoaded(true);
  }, []);

  const forgetLibrary = (libraryId: string) => {
    removeLibraryFromStorage(libraryId);
    setSavedLibraries(getSavedLibraries());
  };

  const forgetAllLibraries = () => {
    clearAllSavedLibraries();
    setSavedLibraries([]);
  };

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      fontSize: '14px', 
      lineHeight: '1.4',
      margin: '20px',
      maxWidth: '800px'
    }}>
      <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>usufruit</h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        distributed library management for communities
      </p>
      
      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
      
      {/* My Libraries Section */}
      {isLoaded && (
        <>
          {savedLibraries.length === 0 ? (
            <div>
              <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>no libraries saved yet</h2>
              <p style={{ margin: '0 0 15px 0' }}>
                when you visit a library, it will be remembered here.
              </p>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>my libraries ({savedLibraries.length})</h2>
              
              <table style={{ width: '100%', marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>name</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>status</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>last accessed</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #999' }}>actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedLibraries.map((library) => {
                    const auth = auths[library.id];
                    return (
                      <tr key={library.id}>
                        <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                          <Link href={`/libraries/${library.id}`} style={{ color: 'blue' }}>
                            {library.name}
                          </Link>
                        </td>
                        <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                          {auth ? (
                            <span style={{ color: 'green', fontSize: '12px' }}>
                              logged in as {auth.name}
                              {auth.isSuper && ' (super)'}
                            </span>
                          ) : (
                            <span style={{ color: '#999', fontSize: '12px' }}>not logged in</span>
                          )}
                        </td>
                        <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                          {new Date(library.lastAccessed).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '4px 8px', border: '1px solid #999' }}>
                          {auth ? (
                            <Link href={`/libraries/${library.id}`} style={{ color: 'blue', fontSize: '12px', marginRight: '8px' }}>
                              view
                            </Link>
                          ) : (
                            <Link href="/auth" style={{ color: 'blue', fontSize: '12px', marginRight: '8px' }}>
                              log in
                            </Link>
                          )}
                          <button 
                            onClick={() => forgetLibrary(library.id)}
                            style={{ 
                              fontSize: '12px',
                              padding: '2px 4px',
                              border: '1px solid #999',
                              background: '#f0f0f0',
                              cursor: 'pointer',
                              color: '#666',
                            }}
                          >
                            forget
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <p style={{ margin: '0 0 15px 0' }}>
                <button 
                  onClick={forgetAllLibraries}
                  style={{ 
                    fontSize: '14px', 
                    padding: '4px 8px',
                    background: '#f0f0f0',
                    border: '1px solid #999',
                    cursor: 'pointer'
                  }}
                >
                  forget all libraries
                </button>
              </p>
            </div>
          )}
          
          <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
        </>
      )}
      
      <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>what is this?</h2>
      <p style={{ margin: '0 0 15px 0' }}>
        usufruit lets communities create their own libraries. anyone can be a librarian. 
        share books, tools, whatever. check things in and out. simple.
      </p>
      
      <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>how it works</h2>
      <ul style={{ margin: '0 0 15px 20px', padding: '0' }}>
        <li>librarians add items to the collection</li>
        <li>community members borrow and return items</li>
        <li>super librarians manage permissions</li>
        <li>everything tracked with simple check-in/out</li>
      </ul>
      
      <h2 style={{ fontSize: '18px', margin: '20px 0 10px 0' }}>get started</h2>
      <ul style={{ margin: '0 0 15px 20px', padding: '0' }}>
        <li><Link href="/libraries/new" style={{ color: 'blue' }}>create a new library</Link></li>
        <li><Link href="/auth" style={{ color: 'blue' }}>log in as librarian</Link></li>
      </ul>
      
      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
      
      <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
        questions? bugs? <a href="mailto:support@usufruit.org" style={{ color: 'blue' }}>email us</a>
      </p>
    </div>
  );
}
