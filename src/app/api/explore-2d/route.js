import { NextResponse } from 'next/server';
import { run2DExploration } from './Exploration2D.js'; // Adjust path as needed
import { chartData } from '../algorithm/Algorithm.js';

export async function POST(request) {
    console.log("Received POST request on /api/explore-2d");
    try {
        const body = await request.json();

        const { scenarios, simulationCount, baseSeed, parameterInfo, userName } = body; // Added parameterInfo extraction

        // --- Basic Validation ---
        if (!Array.isArray(scenarios) || scenarios.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing or empty "scenarios" array in request body.' },
                { status: 400 }
            );
        }
        // Use a default number of simulations if not provided or invalid
        let simsToRun = 10; // Default value
        if (typeof simulationCount === 'number' && simulationCount > 0) {
            simsToRun = simulationCount;
        } else {
            console.warn(`simulationCount not provided or invalid (${simulationCount}), using default: ${simsToRun}`);
        }
        // Validate structure of each item in the scenarios array
        for (let i = 0; i < scenarios.length; i++) {
            const run = scenarios[i];
            const isValidRun = typeof run === 'object' &&
                run !== null &&
                typeof run.parameterValues === 'object' && // Check for parameterValues object
                run.parameterValues !== null &&
                Object.keys(run.parameterValues).length === 2 && // Ensure exactly two parameters
                typeof run.scenario === 'object' &&
                run.scenario !== null;

            if (!isValidRun) {
                console.error(`Validation Error: Item at index ${i} in "scenarios" array has invalid structure.`, run);
                return NextResponse.json(
                    { success: false, error: `Item at index ${i} in "scenarios" array must be an object with a "parameterValues" object (containing exactly two key-value pairs) and a valid "scenario" object.` },
                    { status: 400 }
                );
            }
        }

        // --- Logging ---
        console.log('========================');
        console.log('RECEIVED 2D EXPLORATION REQUEST:');
        console.log('========================');
        if (parameterInfo) { // Log parameter info if frontend sent it
            console.log(`Parameter Info (Context):`, parameterInfo);
        }
        console.log(`Simulation count per combination: ${simsToRun}`);
        console.log(`Number of parameter combinations/scenarios: ${scenarios.length}`);
        if (baseSeed) {
            console.log(`Using base seed: ${baseSeed}`);
        }
        // Log first combo parameters for confirmation
        if (scenarios.length > 0 && scenarios[0].parameterValues) {
            console.log('First combo parameter values:', scenarios[0].parameterValues);
        }
        console.log('========================');


        console.log(`Starting 2D exploration for ${scenarios.length} parameter combinations with ${simsToRun} simulations each.`);


        // --- Run the 2D Exploration ---
        // Pass the pre-modified scenarios directly to the exploration function
        // Note: 'scenarios' corresponds to the 'explorationRuns' parameter in run2DExploration
        const explorationResults = await run2DExploration(
            scenarios, // Pass the array received from the frontend
            simsToRun,
            baseSeed, // Pass the seed (will use default if undefined)
            userName,
        );

        console.log("2D Exploration completed successfully.");

        // --- Return the Results ---
        // The explorationResults object contains aggregated data keyed appropriately for 2D plotting
        return NextResponse.json(
            {
                success: true,
                message: `Successfully completed 2D exploration for ${scenarios.length} parameter combinations.`,
                parameterInfo: parameterInfo || null, // Echo back context if provided
                results: explorationResults // Contains aggregated results for each combo
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error in /api/explore-2d POST handler:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ success: false, error: 'Invalid JSON in request body.' }, { status: 400 });
        }
        return NextResponse.json(
            { success: false, error: 'Failed to process 2D exploration: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}

// Optional: Add a GET handler
export async function GET() {
    return NextResponse.json({ message: "2D Exploration API endpoint. Use POST to submit scenarios array." });
}
