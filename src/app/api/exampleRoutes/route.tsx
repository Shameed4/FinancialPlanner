import { NextRequest, NextResponse } from 'next/server';

// sample GET request (send a request to /api/exampleRoutes )
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query'); // e.g. `/api/search?query=hello`

  return NextResponse.json({ status: 200, result: `You searched for: ${query}` });
}

// sample POST request
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  const newUser = { id: Date.now(), name };

  return NextResponse.json({ user: newUser }, { status: 201 });
}