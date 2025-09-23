import { DatabaseService } from '@usufruit/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const libraries = await DatabaseService.getLibraries();
    return NextResponse.json(libraries);
  } catch (error) {
    console.error('Error fetching libraries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch libraries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, location } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const library = await DatabaseService.createLibrary({
      name,
      description,
      location,
    });

    return NextResponse.json(library, { status: 201 });
  } catch (error) {
    console.error('Error creating library:', error);
    return NextResponse.json(
      { error: 'Failed to create library' },
      { status: 500 }
    );
  }
}
