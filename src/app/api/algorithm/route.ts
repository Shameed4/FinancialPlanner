import { NextResponse } from 'next/server';
import runAlgorithm from './Algorithm.js';

export async function POST(request: Request) {
  try {
    // Parse the incoming JSON
    const simulationData = await request.json();
    const { scenario, numberOfSimulations } = simulationData;

    console.log("hi");
    console.log(numberOfSimulations);
    console.log(scenario);

    // Run the simulation algorithm multiple times.
    const simulationResults = runAlgorithm(scenario, Number(numberOfSimulations));

    // Return the simulation results in the response.
    // return NextResponse.json({ result: simulationResults }, { status: 200 });
  } 
  catch (error: any) {
    console.error('Simulation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
