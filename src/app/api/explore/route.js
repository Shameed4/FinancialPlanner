import { NextResponse } from 'next/server';

// In-memory storage for simulation results
let explorationData = null;

export async function POST(request) {
    try {
        const data = await request.json();

        // Extract the baseline and modified scenarios
        const { baselineScenario, modifiedScenario, parameterInfo } = data;

        console.log('- Baseline Scenario:', baselineScenario?.name, '(ID:', baselineScenario?.id, ')');
        console.log('- Modified Scenario:', modifiedScenario?.name, '(ID:', modifiedScenario?.id, ')');

        // Return a simple acknowledgment
        return NextResponse.json({
            success: true,
            message: 'Successfully received baseline and modified scenarios',
            receivedData: {
                baselineScenarioId: baselineScenario?.id,
                baselineScenarioName: baselineScenario?.name,
                modifiedScenarioId: modifiedScenario?.id,
                modifiedScenarioName: modifiedScenario?.name,
                parameterChanged: parameterInfo?.name,
                parameterId: parameterInfo?.id,
                parameterValue: parameterInfo?.value
            }
        });
    } catch (error) {
        console.error('Error in explore API:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process exploration data: ' + error.message },
            { status: 500 }
        );
    }
} 