import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string; bookId: string } }
) {
  try {
    const { libraryId, bookId } = await params;
    
    // No authorization required - any librarian can view loan history
    
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

    const loans = await DatabaseService.getLoansByBookId(bookId);
    return NextResponse.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { libraryId: string; bookId: string } }
) {
  try {
    const { libraryId, bookId } = await params;
    const body = await request.json();
    const { librarianId } = body;

    // No authorization required - any librarian can borrow books

    if (!librarianId) {
      return NextResponse.json(
        { error: 'Librarian ID is required' },
        { status: 400 }
      );
    }

    // Verify book exists and belongs to this library
    const book = await DatabaseService.getBookById(bookId);
    if (!book || book.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Book not found in this library' },
        { status: 404 }
      );
    }

    // Verify librarian belongs to this library
    const librarian = await DatabaseService.getLibrarianById(librarianId);
    if (!librarian || librarian.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Librarian not found in this library' },
        { status: 404 }
      );
    }

    // Check if book is already on loan
    const activeLoans = await DatabaseService.getActiveLoansByBookId(bookId);
    if (activeLoans.length > 0) {
      return NextResponse.json(
        { error: 'Book is already on loan' },
        { status: 400 }
      );
    }

    // Calculate due date based on book's borrow duration
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + book.borrowDurationDays);

    const loan = await DatabaseService.createLoan({
      bookId,
      librarianId,
      dueDate,
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { error: 'Failed to create loan' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { libraryId: string; bookId: string } }
) {
  try {
    const { libraryId, bookId } = params;
    const body = await request.json();
    const { action, loanId, librarianId } = body;

    // No authorization required - any librarian can return books

    if (action !== 'return') {
      return NextResponse.json(
        { error: 'Only "return" action is supported' },
        { status: 400 }
      );
    }

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      );
    }

    if (!librarianId) {
      return NextResponse.json(
        { error: 'Librarian ID is required' },
        { status: 400 }
      );
    }

    // Verify book exists and belongs to this library
    const book = await DatabaseService.getBookById(bookId);
    if (!book || book.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Book not found in this library' },
        { status: 404 }
      );
    }

    // Verify librarian belongs to this library (any librarian can return books)
    const librarian = await DatabaseService.getLibrarianById(librarianId);
    if (!librarian || librarian.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Librarian not found in this library' },
        { status: 404 }
      );
    }

    // Return the book
    const returnedLoan = await DatabaseService.returnBook(loanId);
    return NextResponse.json(returnedLoan);
  } catch (error) {
    console.error('Error returning book:', error);
    return NextResponse.json(
      { error: 'Failed to return book' },
      { status: 500 }
    );
  }
}
