// Utility functions for managing saved libraries in localStorage

export interface SavedLibrary {
  id: string;
  name: string;
  lastAccessed: string;
}

const STORAGE_KEY = 'usufruit-libraries';

export function saveLibraryToStorage(library: { id: string; name: string }) {
  if (typeof window === 'undefined') return; // Server-side guard
  
  try {
    const existing = getSavedLibraries();
    const updated = existing.filter(lib => lib.id !== library.id); // Remove if exists
    
    // Add to beginning of list
    updated.unshift({
      id: library.id,
      name: library.name,
      lastAccessed: new Date().toISOString(),
    });
    
    // Keep only the 10 most recent
    const limited = updated.slice(0, 10);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Error saving library to storage:', error);
  }
}

export function getSavedLibraries(): SavedLibrary[] {
  if (typeof window === 'undefined') return []; // Server-side guard
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error getting saved libraries:', error);
    return [];
  }
}

export function removeLibraryFromStorage(libraryId: string) {
  if (typeof window === 'undefined') return; // Server-side guard
  
  try {
    const existing = getSavedLibraries();
    const updated = existing.filter(lib => lib.id !== libraryId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing library from storage:', error);
  }
}

export function clearAllSavedLibraries() {
  if (typeof window === 'undefined') return; // Server-side guard
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing saved libraries:', error);
  }
}
