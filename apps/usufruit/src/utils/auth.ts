// Client-side authentication utilities using localStorage
// Supports multiple library-scoped authentications

export interface AuthenticatedLibrarian {
  id: string;
  name: string;
  contactInfo: string;
  isSuper: boolean;
  secretKey: string;
  library: {
    id: string;
    name: string;
    description?: string;
  };
}

const AUTH_STORAGE_KEY = 'usufruit-auth-by-library';

export function getAuthenticatedLibrarian(libraryId: string): AuthenticatedLibrarian | null {
  if (typeof window === 'undefined') return null; // Server-side guard
  
  try {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    const authByLibrary = authData ? JSON.parse(authData) : {};
    return authByLibrary[libraryId] || null;
  } catch (error) {
    console.error('Error getting authenticated librarian:', error);
    return null;
  }
}

export function getAllAuthenticatedLibrarians(): Record<string, AuthenticatedLibrarian> {
  if (typeof window === 'undefined') return {}; // Server-side guard
  
  try {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    return authData ? JSON.parse(authData) : {};
  } catch (error) {
    console.error('Error getting all authenticated librarians:', error);
    return {};
  }
}

export function saveAuthenticatedLibrarian(librarian: AuthenticatedLibrarian) {
  if (typeof window === 'undefined') return; // Server-side guard
  
  try {
    const existing = getAllAuthenticatedLibrarians();
    existing[librarian.library.id] = librarian;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Error saving authenticated librarian:', error);
  }
}

export function clearAuthenticatedLibrarian(libraryId: string) {
  if (typeof window === 'undefined') return; // Server-side guard
  
  try {
    const existing = getAllAuthenticatedLibrarians();
    delete existing[libraryId];
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Error clearing authenticated librarian:', error);
  }
}

export function clearAllAuthentications() {
  if (typeof window === 'undefined') return; // Server-side guard
  
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing all authentications:', error);
  }
}

export function isLoggedInToLibrary(libraryId: string): boolean {
  return getAuthenticatedLibrarian(libraryId) !== null;
}

export function getAuthHeaders(libraryId: string): { Authorization: string } | Record<string, never> {
  const auth = getAuthenticatedLibrarian(libraryId);
  if (!auth?.secretKey) return {};
  
  return {
    Authorization: `Bearer ${auth.secretKey}`,
  };
}
