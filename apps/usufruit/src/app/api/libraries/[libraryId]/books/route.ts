import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { libraryId } = await params;
    const { searchParams } = request.nextUrl;
    
    // No authorization required - any librarian can view all books
    
    // Verify library exists first
    const library = await DatabaseService.getLibraryById(libraryId);
    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    // Check if pagination/search parameters are provided
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');

    if (page || limit || search) {
      // Use paginated method
      const options = {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? Math.min(parseInt(limit, 10), 100) : undefined, // Cap at 100
        search: search || undefined,
      };

      const result = await DatabaseService.getBooksByLibraryIdPaginated(libraryId, options);
      return NextResponse.json(result);
    } else {
      // Use original method for backward compatibility
      const books = await DatabaseService.getBooksByLibraryId(libraryId);
      return NextResponse.json(books);
    }
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
    const { libraryId } = await params;
    const body = await request.json();
    const { title, author, description, borrowDurationDays, organizingRules, checkInInstructions, checkOutInstructions, librarianId } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!borrowDurationDays || borrowDurationDays < 1) {
      return NextResponse.json(
        { error: 'Borrow duration must be at least 1 day' },
        { status: 400 }
      );
    }

    if (!librarianId) {
      return NextResponse.json(
        { error: 'Librarian ID is required' },
        { status: 400 }
      );
    }

    // Require authorization for creating books
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required to create books' },
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

    // Only super librarians or the specified librarian can create books
    if (!authenticatedLibrarian.isSuper && authenticatedLibrarian.id !== librarianId) {
      return NextResponse.json(
        { error: 'You can only create books for yourself, or be a super librarian' },
        { status: 403 }
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
      borrowDurationDays,
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
