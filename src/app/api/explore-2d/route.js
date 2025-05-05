import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // Parse the JSON body from the request
        const body = await request.json();

        // Extract the data
        const { scenarios, simulationCount } = body;

        console.log('========================');
        console.log('RECEIVED 2D EXPLORATION REQUEST:');
        console.log('========================');
        console.log(`Simulation count: ${simulationCount}`);
        console.log(`Number of scenarios: ${scenarios ? scenarios.length : 'N/A'}`);
        console.log('========================');

        if (!Array.isArray(scenarios) || scenarios.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing or empty "scenarios" array in request body.' },
                { status: 400 }
            );
        }

        let simsToRun = 10; // Default value
        if (typeof simulationCount === 'number' && simulationCount > 0) {
            simsToRun = simulationCount;
        } else {
            console.warn(`simulationCount not provided or invalid (${simulationCount}), using default: ${simsToRun}`);
        }

        // Log some details about the scenarios
        console.log(`Received ${scenarios.length} scenarios for 2D exploration with ${simsToRun} simulations each.`);

        // For demonstration, log parameter info for the first scenario
        if (scenarios.length > 0) {
            const firstScenario = scenarios[0];
            console.log('First scenario parameter values:', firstScenario.parameterValues);
        }

        // This is a simple endpoint that just acknowledges receipt of the data
        // In a real implementation, you would process this data or queue it for processing

        return NextResponse.json(
            {
                success: true,
                message: `Successfully received ${scenarios.length} scenarios for 2D exploration.`,
                // Just echo back some basic info for confirmation
                scenarioCount: scenarios.length,
                simulationsPerScenario: simsToRun
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error in /api/explore-2d POST handler:', error);
        // Check if it's a JSON parsing error
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON in request body.' },
                { status: 400 }
            );
        }
        // General error
        return NextResponse.json(
            { success: false, error: 'Failed to process 2D exploration: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
} 