import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // Parse the JSON body from the request
        const body = await request.json();

        // Extract the data
        const { scenarios, simulationCount, parameterType, changedPath, details } = body;

        // Log the received data for debugging
        console.log('========================');
        console.log('RECEIVED EXPLORATION REQUEST:');
        console.log('========================');
        console.log(`Parameter type: ${parameterType}`);
        console.log(`Changed path: ${changedPath}`);
        console.log(`Simulation count: ${simulationCount}`);
        console.log(`Number of scenarios: ${scenarios ? scenarios.length : 'N/A'}`);
        //console.log('Details:', JSON.stringify(details, null, 2));
        console.log('========================');

        // In a production environment, this is where you would:
        // 1. Save the scenarios to the database
        // 2. Queue up the simulations for processing
        // 3. Return a job ID that the client can use to check the status

        // For now, just return a success response
        return NextResponse.json({
            success: true,
            message: `Successfully received exploration request for ${parameterType} with ${simulationCount} simulations.`,
            jobId: `explore-${Date.now()}`,
            receivedData: {
                scenarioCount: scenarios ? scenarios.length : 'N/A',
                simulationCount,
                parameterType,
                changedPath,
            }
        });
    } catch (error) {
        console.error('Error processing exploration request:', error);

        return NextResponse.json({
            success: false,
            message: 'Failed to process exploration request',
            error: error.message
        }, { status: 500 });
    }
}