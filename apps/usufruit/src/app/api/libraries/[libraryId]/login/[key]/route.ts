import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@usufruit/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { libraryId: string; key: string } }
) {
  try {
    const { libraryId, key } = params;

    if (!libraryId || !key) {
      return NextResponse.json(
        { error: 'Library ID and key are required' },
        { status: 400 }
      );
    }

    // Verify the key and get librarian info
    const librarian = await DatabaseService.authenticateLibrarian(key);
    
    if (!librarian) {
      return NextResponse.json(
        { error: 'Invalid authentication key' },
        { status: 401 }
      );
    }

    // Verify the librarian belongs to the requested library
    if (librarian.libraryId !== libraryId) {
      return NextResponse.json(
        { error: 'Invalid authentication key for this library' },
        { status: 401 }
      );
    }

    // Create success response with librarian info and redirect URL
    const baseUrl = request.nextUrl.origin;
    const redirectUrl = `${baseUrl}/libraries/${libraryId}`;
    
    return NextResponse.json({
      success: true,
      librarian: {
        id: librarian.id,
        name: librarian.name,
        contactInfo: librarian.contactInfo,
        isSuper: librarian.isSuper,
        library: {
          id: librarian.library.id,
          name: librarian.library.name,
          description: librarian.library.description
        }
      },
      redirectUrl,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Login endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
