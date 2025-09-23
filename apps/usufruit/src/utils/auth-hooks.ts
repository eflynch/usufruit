// Custom hooks for authentication state management
// These hooks ensure auth data is only fetched when needed and properly memoized

import { useState, useEffect, useMemo } from 'react';
import { 
  getAuthenticatedLibrarian, 
  getAllAuthenticatedLibrarians, 
  getAuthHeaders,
  AuthenticatedLibrarian 
} from './auth';

/**
 * Hook to get authentication status for a specific library
 * Memoizes the result to prevent unnecessary re-renders
 */
export function useLibraryAuth(libraryId: string | undefined) {
  const [auth, setAuth] = useState<AuthenticatedLibrarian | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!libraryId) {
      setAuth(null);
      setIsLoading(false);
      return;
    }

    const authenticatedLibrarian = getAuthenticatedLibrarian(libraryId);
    setAuth(authenticatedLibrarian);
    setIsLoading(false);
  }, [libraryId]);

  // Memoized derived values
  const isAuthenticated = useMemo(() => auth !== null, [auth]);
  const isSuper = useMemo(() => auth?.isSuper ?? false, [auth]);
  const authHeaders = useMemo(() => {
    if (!libraryId || !auth) return {};
    return getAuthHeaders(libraryId);
  }, [libraryId, auth]);

  return {
    auth,
    isAuthenticated,
    isSuper,
    authHeaders,
    isLoading,
    // Helper function to refresh auth state if needed
    refresh: () => {
      if (libraryId) {
        const newAuth = getAuthenticatedLibrarian(libraryId);
        setAuth(newAuth);
      }
    }
  };
}

/**
 * Hook to get all authentication states across all libraries
 * Useful for global auth status displays
 */
export function useAllLibraryAuth() {
  const [auths, setAuths] = useState<Record<string, AuthenticatedLibrarian>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const allAuths = getAllAuthenticatedLibrarians();
    setAuths(allAuths);
    setIsLoading(false);
  }, []);

  // Memoized derived values
  const hasAnyAuth = useMemo(() => Object.keys(auths).length > 0, [auths]);
  const authCount = useMemo(() => Object.keys(auths).length, [auths]);
  const authEntries = useMemo(() => Object.values(auths), [auths]);

  return {
    auths,
    authEntries,
    hasAnyAuth,
    authCount,
    isLoading,
    // Helper function to refresh all auth states if needed
    refresh: () => {
      const newAuths = getAllAuthenticatedLibrarians();
      setAuths(newAuths);
    },
    // Helper to update a specific library's auth state
    updateLibraryAuth: (libraryId: string, newAuth: AuthenticatedLibrarian | null) => {
      setAuths(prev => {
        const updated = { ...prev };
        if (newAuth) {
          updated[libraryId] = newAuth;
        } else {
          delete updated[libraryId];
        }
        return updated;
      });
    }
  };
}
