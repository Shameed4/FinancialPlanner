import { NextResponse } from 'next/server';
import { chartData } from '../algorithm/Algorithm.js';

// GET endpoint that returns the in-memory chartData
export async function GET(request: Request) {
    return NextResponse.json({ chartData }, { status: 200 })
  }