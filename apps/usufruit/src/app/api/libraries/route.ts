import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@usufruit/database';

export async function GET() {
  return NextResponse.json(
    { error: 'Access denied. Please specify a library ID in the URL path.' },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, location, firstLibrarian } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Library name is required' },
        { status: 400 }
      );
    }

    if (!firstLibrarian?.name?.trim() || !firstLibrarian?.email?.trim()) {
      return NextResponse.json(
        { error: 'First librarian name and contact info are required' },
        { status: 400 }
      );
    }

    // Create the library
    const library = await DatabaseService.createLibrary({
      name: name.trim(),
      description: description?.trim() || undefined,
      location: location?.trim() || undefined,
    });

    // Create the first super librarian
    const librarian = await DatabaseService.createLibrarian({
      name: firstLibrarian.name.trim(),
      contactInfo: firstLibrarian.email.trim(), // Required contact info (not necessarily email)
      libraryId: library.id,
      isSuper: true,
    });

    return NextResponse.json({
      data: {
        library,
        librarian,
      },
    });
  } catch (error) {
    console.error('Error creating library:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create library' },
      { status: 500 }
    );
  }
}
