import { NextResponse } from 'next/server';
import { runScenarioComparison } from '../explore/Exploration.js'


export async function POST(request) {
    try {
        const data = await request.json();

        // Extract the baseline and modified scenarios
        const { baselineScenario, modifiedScenario, parameterInfo, numberOfSimulations, baseSeed } = data;

        console.log('- Baseline Scenario:', baselineScenario?.name, '(ID:', baselineScenario?.id, ')');
        console.log('- Modified Scenario:', modifiedScenario?.name, '(ID:', modifiedScenario?.id, ')');

        // --- Basic Validation ---
        if (!baselineScenario || typeof baselineScenario !== 'object' || baselineScenario === null) {
            return NextResponse.json({ success: false, error: 'Missing or invalid "baselineScenario".' }, { status: 400 });
        }
        if (!modifiedScenario || typeof modifiedScenario !== 'object' || modifiedScenario === null) {
            return NextResponse.json({ success: false, error: 'Missing or invalid "modifiedScenario".' }, { status: 400 });
        }
        // Use a default number of simulations if not provided or invalid
        let simsToRun = 1; // Default value
        if (typeof numberOfSimulations === 'number' && numberOfSimulations > 0) {
            simsToRun = numberOfSimulations;
        } else {
            console.warn(`numberOfSimulations not provided or invalid (${numberOfSimulations}), using default: ${simsToRun}`);
        }

        console.log(`Starting comparison for baseline "${baselineScenario.name || baselineScenario.id}" vs modified "${modifiedScenario.name || modifiedScenario.id}"`);
        if (parameterInfo) {
            console.log(`Parameter Changed: ${parameterInfo.name || parameterInfo.id} to ${parameterInfo.value}`);
        }
        console.log(`Number of Simulations per scenario: ${simsToRun}`);
        if (baseSeed) {
            console.log(`Using base seed: ${baseSeed}`);
        }

        // --- Run the Comparison ---
        // Call the function designed to compare two scenarios
        const comparisonResults = await runScenarioComparison(
            baselineScenario,
            modifiedScenario,
            simsToRun,
            baseSeed
        );

        console.log("Scenario comparison completed.");

        // --- Return the Results ---
        // The comparisonResults object contains { baseline: {...}, modified: {...} }
        return NextResponse.json(
            {
                success: true,
                message: `Successfully compared baseline and modified scenarios.`,
                parameterInfo: parameterInfo || null, // Echo back parameter info if provided
                results: comparisonResults // Contains aggregated results for both scenarios
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error in /api/explore/1d POST handler (Comparison Mode):', error);
        // Check if it's a JSON parsing error
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON in request body.' },
                { status: 400 }
            );
        }
        // General error
        return NextResponse.json(
            { success: false, error: 'Failed to process scenario comparison: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}