import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string; librarianId: string } }
) {
  try {
    const { libraryId, librarianId } = params;
    
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
    const { libraryId, librarianId } = params;
    const body = await request.json();
    const { isSuper } = body;

    // Require authorization for updating super status
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

    // Update super status
    if (typeof isSuper === 'boolean') {
      const updatedLibrarian = await DatabaseService.updateLibrarianSuperStatus(
        librarianId,
        isSuper,
        authenticatedLibrarian.id
      );
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
