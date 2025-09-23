import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { libraryId } = await params;
    
    const library = await DatabaseService.getLibraryById(libraryId);
    
    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(library);
  } catch (error) {
    console.error('Error fetching library:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { libraryId } = await params;
    const body = await request.json();
    const { name, description, location } = body;

    // Require authorization for modifying libraries
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required to modify library' },
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

    // Only super librarians can modify library details
    if (!authenticatedLibrarian.isSuper) {
      return NextResponse.json(
        { error: 'Only super librarians can modify library details' },
        { status: 403 }
      );
    }

    const library = await DatabaseService.updateLibrary(libraryId, {
      name,
      description,
      location,
    });

    if (!library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(library);
  } catch (error) {
    console.error('Error updating library:', error);
    return NextResponse.json(
      { error: 'Failed to update library' },
      { status: 500 }
    );
  }
}
