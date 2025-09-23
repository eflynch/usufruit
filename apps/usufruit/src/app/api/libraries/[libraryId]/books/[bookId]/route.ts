import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string; bookId: string } }
) {
  try {
    const { libraryId, bookId } = await params;
    
    // No authorization required - any librarian can view any book
    
    const book = await DatabaseService.getBookById(bookId);
    
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Verify book belongs to this library
    if (book.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Book not found in this library' },
        { status: 404 }
      );
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { libraryId: string; bookId: string } }
) {
  try {
    const { libraryId, bookId } = await params;
    const body = await request.json();
    
    // Require authorization for modifying books
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required to modify books' },
        { status: 401 }
      );
    }

    const secretKey = authHeader.substring(7);
    const authenticatedLibrarian = await DatabaseService.authenticateLibrarian(secretKey);
    
    if (!authenticatedLibrarian || authenticatedLibrarian.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Invalid authorization' },
        { status: 403 }
      );
    }
    
    const book = await DatabaseService.getBookById(bookId);
    
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Verify book belongs to this library
    if (book.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Book not found in this library' },
        { status: 404 }
      );
    }

    // Only super librarians or the book owner can modify books
    if (!authenticatedLibrarian.isSuper && authenticatedLibrarian.id !== book.librarianId) {
      return NextResponse.json(
        { error: 'You can only modify your own books, or be a super librarian' },
        { status: 403 }
      );
    }

    const updatedBook = await DatabaseService.updateBook(bookId, body);
    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    );
  }
}
