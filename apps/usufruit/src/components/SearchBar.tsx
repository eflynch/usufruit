'use client';

import { useState, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  debounceMs?: number;
}

export default function SearchBar({ 
  onSearch, 
  placeholder = "Search...", 
  initialValue = "",
  debounceMs = 300 
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, onSearch, debounceMs]);

  return (
    <div style={{ marginBottom: '20px' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '8px 12px',
          border: '1px solid #999',
          borderRadius: '4px',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          backgroundColor: 'white',
        }}
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          style={{
            marginLeft: '8px',
            padding: '8px 12px',
            border: '1px solid #999',
            backgroundColor: '#f5f5f5',
            cursor: 'pointer',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
