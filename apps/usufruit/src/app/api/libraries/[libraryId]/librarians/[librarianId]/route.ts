import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string; librarianId: string } }
) {
  try {
    const { libraryId, librarianId } = await params;
    
    // Get requesting librarian from Authorization header
    const authHeader = request.headers.get('authorization');
    const requestingLibrarianId = request.nextUrl.searchParams.get('requestingLibrarianId');
    
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
    
    const librarian = await DatabaseService.getLibrarianByIdSecure(librarianId, authenticatedLibrarianId);
    
    if (!librarian) {
      return NextResponse.json(
        { error: 'Librarian not found' },
        { status: 404 }
      );
    }

    // Verify librarian belongs to this library
    if (librarian.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Librarian not found in this library' },
        { status: 404 }
      );
    }

    return NextResponse.json(librarian);
  } catch (error) {
    console.error('Error fetching librarian:', error);
    return NextResponse.json(
      { error: 'Failed to fetch librarian' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { libraryId: string; librarianId: string } }
) {
  try {
    const { libraryId, librarianId } = await params;
    const body = await request.json();
    const { isSuper, name, contactInfo } = body;

    // Require authorization for updating librarian details
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
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

    // Verify target librarian exists and belongs to this library
    const targetLibrarian = await DatabaseService.getLibrarianById(librarianId);
    if (!targetLibrarian || targetLibrarian.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Librarian not found in this library' },
        { status: 404 }
      );
    }

    let updatedLibrarian;

    // Handle super status updates (only super librarians can do this)
    if (typeof isSuper === 'boolean') {
      if (!authenticatedLibrarian.isSuper) {
        return NextResponse.json(
          { error: 'Only super librarians can change super status' },
          { status: 403 }
        );
      }
      updatedLibrarian = await DatabaseService.updateLibrarianSuperStatus(
        librarianId,
        isSuper,
        authenticatedLibrarian.id
      );
    }

    // Handle name and contact info updates (users can edit their own, super librarians can edit anyone's)
    if (name !== undefined || contactInfo !== undefined) {
      if (!authenticatedLibrarian.isSuper && authenticatedLibrarian.id !== librarianId) {
        return NextResponse.json(
          { error: 'You can only edit your own details, or be a super librarian' },
          { status: 403 }
        );
      }

      updatedLibrarian = await DatabaseService.updateLibrarianDetails(librarianId, {
        name,
        contactInfo
      });
    }

    if (updatedLibrarian) {
      return NextResponse.json(updatedLibrarian);
    }

    return NextResponse.json(
      { error: 'No valid updates provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating librarian:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update librarian' },
      { status: 500 }
    );
  }
}
