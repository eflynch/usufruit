import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { libraryId } = await params;
    const { searchParams } = request.nextUrl;
    
    // Get requesting librarian from Authorization header or query param
    const authHeader = request.headers.get('authorization');
    const requestingLibrarianId = searchParams.get('requestingLibrarianId');
    
    let authenticatedLibrarianId: string | undefined;
    
    // If secret key provided in Authorization header, authenticate
    if (authHeader?.startsWith('Bearer ')) {
      const secretKey = authHeader.substring(7);
      const authenticatedLibrarian = await DatabaseService.authenticateLibrarian(secretKey);
      if (authenticatedLibrarian && authenticatedLibrarian.libraryId === libraryId) {
        authenticatedLibrarianId = authenticatedLibrarian.id;
      }
    } else if (requestingLibrarianId) {
      // Basic check if librarian ID is provided (less secure)
      const librarian = await DatabaseService.getLibrarianById(requestingLibrarianId);
      if (librarian && librarian.libraryId === libraryId) {
        authenticatedLibrarianId = requestingLibrarianId;
      }
    }
    
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

      const result = await DatabaseService.getLibrariansByLibraryIdSecurePaginated(
        libraryId, 
        authenticatedLibrarianId, 
        options
      );
      return NextResponse.json(result);
    } else {
      // Use original method for backward compatibility
      const librarians = await DatabaseService.getLibrariansByLibraryIdSecure(libraryId, authenticatedLibrarianId);
      return NextResponse.json(librarians);
    }
  } catch (error) {
    console.error('Error fetching librarians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch librarians' },
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
    const { name, contactInfo, isSuper } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!contactInfo) {
      return NextResponse.json(
        { error: 'Contact info is required' },
        { status: 400 }
      );
    }

    // If trying to create a super librarian, verify authorization
    if (isSuper) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authorization required to create super librarians' },
          { status: 401 }
        );
      }

      const secretKey = authHeader.substring(7);
      const authenticatedLibrarian = await DatabaseService.authenticateLibrarian(secretKey);
      
      if (!authenticatedLibrarian?.isSuper || authenticatedLibrarian.libraryId !== libraryId) {
        return NextResponse.json(
          { error: 'Only super librarians can create other super librarians' },
          { status: 403 }
        );
      }
    }

    // Verify library exists
    const library = await DatabaseService.getLibraryById(libraryId);
    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    const librarian = await DatabaseService.createLibrarian({
      name,
      contactInfo,
      libraryId,
      isSuper: isSuper || false,
    });

    // The secret key is included in the response only at creation time
    return NextResponse.json(librarian, { status: 201 });
  } catch (error) {
    console.error('Error creating librarian:', error);
    return NextResponse.json(
      { error: 'Failed to create librarian' },
      { status: 500 }
    );
  }
}
