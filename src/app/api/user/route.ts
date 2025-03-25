import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

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