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

    const librarians = await DatabaseService.getLibrariansByLibraryId(libraryId);
    return NextResponse.json(librarians);
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
    const { libraryId } = params;
    const body = await request.json();
    const { name, contactInfo } = body;

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
    });

    return NextResponse.json(librarian, { status: 201 });
  } catch (error) {
    console.error('Error creating librarian:', error);
    return NextResponse.json(
      { error: 'Failed to create librarian' },
      { status: 500 }
    );
  }
}
