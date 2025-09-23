'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { saveLibraryToStorage } from '../../../utils/saved-libraries';

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const libraryId = params?.libraryId as string;

  // Save library to storage whenever any library page is visited
  useEffect(() => {
    if (!libraryId) return;

    const fetchAndSaveLibrary = async () => {
      try {
        const libraryResponse = await fetch(`/api/libraries/${libraryId}`);
        if (libraryResponse.ok) {
          const libraryData = await libraryResponse.json();
          saveLibraryToStorage({
            id: libraryData.id,
            name: libraryData.name,
          });
        }
      } catch (error) {
        // Don't fail the page if library saving fails
        console.warn('Failed to save library to storage:', error);
      }
    };

    fetchAndSaveLibrary();
  }, [libraryId]);

  return <>{children}</>;
}