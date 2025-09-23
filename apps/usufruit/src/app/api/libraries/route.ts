import { NextResponse } from 'next/server';

// Global library operations are no longer allowed
// All operations must be scoped to a specific library ID

export async function GET() {
  return NextResponse.json(
    { error: 'Access denied. Please specify a library ID in the URL path.' },
    { status: 403 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Access denied. Library creation must be done through a specific administrative interface.' },
    { status: 403 }
  );
}
