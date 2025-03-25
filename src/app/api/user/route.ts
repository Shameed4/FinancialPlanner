import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');
        
        if (!query) {
            return NextResponse.json({ status: 400, error: 'Search query is required' });
        }
        
        // Search for users whose email contains the query string
        const users = await prisma.user.findMany({
            where: {
                id: {
                    contains: query
                }
            },
            take: 10 // Limit to 10 results
        });
        
        return NextResponse.json({ 
            status: 200, 
            result: users.map(user => ({
                email: user.id,
                id: user.id
            }))
        });
    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json(
            { status: 500, error: 'Failed to search users' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, googleId } = body;

        // Use upsert to handle both creation and update cases
        const user = await prisma.user.upsert({
            where: {
                id: email
            },
            update: {
                googleId: googleId
            },
            create: {
                id: email,
                googleId: googleId
            }
        });

        return NextResponse.json({ status: 200, result: user });
    } catch (error) {
        console.error('Error in user creation:', error);
        return NextResponse.json(
            { status: 500, error: 'Failed to create/fetch user' },
            { status: 500 }
        );
    }
} 