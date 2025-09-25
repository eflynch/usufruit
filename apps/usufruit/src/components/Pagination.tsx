'use client';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  itemName?: string; // e.g., "items", "librarians"
}

export default function Pagination({ 
  pagination, 
  onPageChange, 
  itemName = "items" 
}: PaginationProps) {
  const { currentPage, totalPages, totalCount, hasNextPage, hasPreviousPage } = pagination;

  if (totalPages <= 1) {
    return null; // Don't show pagination if there's only one page
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page ± 2 pages, with first and last
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push(-1); // -1 represents "..."
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push(-1); // -1 represents "..."
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      marginTop: '20px',
      flexWrap: 'wrap'
    }}>
      <span style={{ 
        fontSize: '14px', 
        color: '#666', 
        marginRight: '16px' 
      }}>
        {totalCount} {itemName} total
      </span>
      
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
        style={{
          padding: '4px 8px',
          border: '1px solid #999',
          backgroundColor: hasPreviousPage ? '#f5f5f5' : '#e5e5e5',
          cursor: hasPreviousPage ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          fontSize: '14px',
          color: hasPreviousPage ? 'black' : '#999',
        }}
      >
        ← Previous
      </button>
      
      {pageNumbers.map((pageNum, index) => {
        if (pageNum === -1) {
          return (
            <span key={`ellipsis-${index}`} style={{ 
              padding: '4px 8px', 
              color: '#999' 
            }}>
              ...
            </span>
          );
        }
        
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            style={{
              padding: '4px 8px',
              border: '1px solid #999',
              backgroundColor: pageNum === currentPage ? '#ddd' : '#f5f5f5',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: pageNum === currentPage ? 'bold' : 'normal',
            }}
          >
            {pageNum}
          </button>
        );
      })}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        style={{
          padding: '4px 8px',
          border: '1px solid #999',
          backgroundColor: hasNextPage ? '#f5f5f5' : '#e5e5e5',
          cursor: hasNextPage ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          fontSize: '14px',
          color: hasNextPage ? 'black' : '#999',
        }}
      >
        Next →
      </button>
    </div>
  );
}
