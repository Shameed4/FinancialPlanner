import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { scenarioId, userEmail, permission, ownerEmail } = body;

        if (!scenarioId || !userEmail || !permission || !ownerEmail) {
            return NextResponse.json({ 
                status: 400, 
                error: 'Scenario ID, user email, permission type, and owner email are required' 
            });
        }

        // Check if owner has permission to share (owns the scenario)
        const scenario = await prisma.scenario.findFirst({
            where: {
                id: scenarioId,
                ownerId: ownerEmail
            }
        });

        if (!scenario) {
            return NextResponse.json({ 
                status: 403, 
                error: 'You do not have permission to share this scenario' 
            });
        }

        // Check if target user exists, if not create them
        const targetUser = await prisma.user.findUnique({
            where: { id: userEmail }
        });

        if (!targetUser) {
            await prisma.user.create({
                data: {
                    id: userEmail,
                    googleId: userEmail // Placeholder until they log in
                }
            });
        }

        // Add user to appropriate permission list
        if (permission === 'read') {
            // First, ensure they're not already in readwrite permission
            await prisma.scenario.update({
                where: { id: scenarioId },
                data: {
                    readwritePrivilege: {
                        disconnect: { id: userEmail }
                    }
                }
            });
            
            // Add to readonly permission
            await prisma.scenario.update({
                where: { id: scenarioId },
                data: {
                    readonlyPrivilege: {
                        connect: { id: userEmail }
                    }
                }
            });
        } else if (permission === 'write') {
            // First, ensure they're not already in readonly permission
            await prisma.scenario.update({
                where: { id: scenarioId },
                data: {
                    readonlyPrivilege: {
                        disconnect: { id: userEmail }
                    }
                }
            });
            
            // Add to readwrite permission
            await prisma.scenario.update({
                where: { id: scenarioId },
                data: {
                    readwritePrivilege: {
                        connect: { id: userEmail }
                    }
                }
            });
        } else {
            return NextResponse.json({ 
                status: 400, 
                error: 'Invalid permission type. Must be "read" or "write"' 
            });
        }

        return NextResponse.json({ status: 200, result: { success: true }});
    } catch (error) {
        console.error('Error sharing scenario:', error);
        return NextResponse.json({ 
            status: 500, 
            error: 'Failed to share scenario' 
        });
    }
}

export async function DELETE(request: NextRequest) {
    const url = new URL(request.url);
    const scenarioId = url.searchParams.get('scenarioId');
    const userEmail = url.searchParams.get('userEmail');
    const ownerEmail = url.searchParams.get('ownerEmail');
    
    if (!scenarioId || !userEmail || !ownerEmail) {
        return NextResponse.json({ 
            status: 400, 
            error: 'Scenario ID, user email, and owner email are required' 
        });
    }

    try {
        // Check if owner has permission to modify sharing (owns the scenario)
        const scenario = await prisma.scenario.findFirst({
            where: {
                id: parseInt(scenarioId),
                ownerId: ownerEmail
            }
        });

        if (!scenario) {
            return NextResponse.json({ 
                status: 403, 
                error: 'You do not have permission to modify sharing for this scenario' 
            });
        }

        // Remove user from both permission lists
        await prisma.scenario.update({
            where: { id: parseInt(scenarioId) },
            data: {
                readonlyPrivilege: {
                    disconnect: { id: userEmail }
                },
                readwritePrivilege: {
                    disconnect: { id: userEmail }
                }
            }
        });

        return NextResponse.json({ status: 200, result: { success: true }});
    } catch (error) {
        console.error('Error removing shared access:', error);
        return NextResponse.json({ 
            status: 500, 
            error: 'Failed to remove shared access' 
        });
    }
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const scenarioId = url.searchParams.get('scenarioId');
    
    if (!scenarioId) {
        return NextResponse.json({ 
            status: 400, 
            error: 'Scenario ID is required' 
        });
    }

    try {
        // Get scenario with shared permissions
        const scenario = await prisma.scenario.findUnique({
            where: {
                id: parseInt(scenarioId)
            },
            include: {
                readonlyPrivilege: true,
                readwritePrivilege: true
            }
        });

        if (!scenario) {
            return NextResponse.json({ 
                status: 404, 
                error: 'Scenario not found' 
            });
        }

        return NextResponse.json({ 
            status: 200, 
            result: {
                readonly: scenario.readonlyPrivilege.map(user => ({
                    email: user.id,
                    id: user.id
                })),
                readwrite: scenario.readwritePrivilege.map(user => ({
                    email: user.id,
                    id: user.id
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching shared permissions:', error);
        return NextResponse.json({ 
            status: 500, 
            error: 'Failed to fetch shared permissions' 
        });
    }
} 