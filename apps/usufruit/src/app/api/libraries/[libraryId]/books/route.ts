import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { libraryId } = params;
    
    // Verify library exists first
    const library = await DatabaseService.getLibraryById(libraryId);
    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    const books = await DatabaseService.getBooksByLibraryId(libraryId);
    return NextResponse.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { libraryId } = params;
    const body = await request.json();
    const { title, author, description, organizingRules, checkInInstructions, checkOutInstructions, librarianId } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!librarianId) {
      return NextResponse.json(
        { error: 'Librarian ID is required' },
        { status: 400 }
      );
    }

    // Verify library exists
    const library = await DatabaseService.getLibraryById(libraryId);
    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
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

    const book = await DatabaseService.createBook({
      title,
      author,
      description,
      organizingRules,
      checkInInstructions,
      checkOutInstructions,
      libraryId,
      librarianId,
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    );
  }
}
