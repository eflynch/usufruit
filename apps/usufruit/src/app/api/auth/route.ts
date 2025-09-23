import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@usufruit/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secretKey } = body;

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Secret key is required' },
        { status: 400 }
      );
    }

    // Authenticate the librarian
    const librarian = await DatabaseService.authenticateLibrarian(secretKey);

    if (!librarian) {
      return NextResponse.json(
        { error: 'Invalid secret key' },
        { status: 401 }
      );
    }

    // Return the authenticated librarian and library data
    return NextResponse.json({
      success: true,
      data: {
        librarian: {
          id: librarian.id,
          name: librarian.name,
          contactInfo: librarian.contactInfo,
          isSuper: librarian.isSuper,
          secretKey: librarian.secretKey, // Include for client-side storage
          library: librarian.library,
        },
        library: librarian.library,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
