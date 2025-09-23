import Link from 'next/link';

interface LibraryPageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function LibraryPageContainer({ children, className }: LibraryPageContainerProps) {
  return (
    <div 
      className={className}
      style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        lineHeight: '1.4',
        margin: '20px',
        maxWidth: '800px'
      }}
    >
      {children}
    </div>
  );
}

interface BackToLibraryLinkProps {
  libraryId: string;
}

export function BackToLibraryLink({ libraryId }: BackToLibraryLinkProps) {
  return (
    <p style={{ margin: '0 0 20px 0' }}>
      <Link href={`/libraries/${libraryId}`} style={{ color: 'blue' }}>
        &larr; back to library
      </Link>
    </p>
  );
}

export function LibrarySectionDivider() {
  return (
    <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />
  );
}
