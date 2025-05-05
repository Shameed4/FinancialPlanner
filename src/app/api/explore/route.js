import { NextResponse } from 'next/server';
import { run1DExploration } from './Exploration.js';

export async function POST(request) {
    try {
        // Parse the JSON body from the request
        const body = await request.json();

        // Extract the data
        const { scenarios, simulationCount, parameterType, changedPath, baseSeed, userName } = body;

        console.log('========================');
        console.log('RECEIVED EXPLORATION REQUEST:');
        console.log('========================');
        console.log(`Simulation count: ${simulationCount}`);
        console.log(`Number of scenarios: ${scenarios ? scenarios.length : 'N/A'}`);
        console.log('========================');

        if (!Array.isArray(scenarios) || scenarios.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing or empty "explorationRuns" array in request body.' },
                { status: 400 }
            );
        }

        let simsToRun = 10; // Default value
        if (typeof simulationCount === 'number' && simulationCount > 0) {
            simsToRun = simulationCount;
        } else {
            console.warn(`numberOfSimulations not provided or invalid (${simulationCount}), using default: ${simsToRun}`);
        }
        // Validate structure of each item in explorationRuns
        for (const run of scenarios) {
            if (typeof run !== 'object' || run === null || !run.hasOwnProperty('parameterValue') || typeof run.scenario !== 'object' || run.scenario === null) {
                return NextResponse.json(
                    { success: false, error: 'Each item in "explorationRuns" must be an object with "parameterValue" and "scenario" properties.' },
                    { status: 400 }
                );
            }
        }

        console.log(`Starting 1D exploration for ${scenarios.length} parameter values with ${simsToRun} simulations each.`);
        if (baseSeed) {
            console.log(`Using base seed: ${baseSeed}`);
        }

        const explorationResults = await run1DExploration(
            scenarios,
            simsToRun,
            baseSeed,
            userName,
        );

        console.log("1D Exploration completed successfully.");

        return NextResponse.json(
            {
                success: true,
                message: `Successfully completed 1D exploration for ${scenarios.length} parameter values.`,
                results: explorationResults
            },
            { status: 200 }
        );

        // In a production environment, this is where you would:
        // 1. Save the scenarios to the database
        // 2. Queue up the simulations for processing
        // 3. Return a job ID that the client can use to check the status

    } catch (error) {
        console.error('Error in /api/explore/1d POST handler (Frontend Mod):', error);
        // Check if it's a JSON parsing error
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON in request body.' },
                { status: 400 }
            );
        }
        // General error
        return NextResponse.json(
            { success: false, error: 'Failed to process 1D exploration: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}