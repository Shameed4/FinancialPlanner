import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, googleId } = body;

        // Try to find existing user
        let user = await prisma.user.findUnique({
            where: {
                id: email
            }
        });

        // If user doesn't exist, create them
        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: email,
                    googleId: googleId
                }
            });
        }

        return NextResponse.json({ status: 200, result: user });
    } catch (error) {
        console.error('Error in user creation:', error);
        return NextResponse.json(
            { status: 500, error: 'Failed to create/fetch user' },
            { status: 500 }
        );
    }
} 