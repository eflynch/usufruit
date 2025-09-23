import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string; bookId: string } }
) {
  try {
    const { libraryId, bookId } = params;
    
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
    const { libraryId, bookId } = params;
    const body = await request.json();
    
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
