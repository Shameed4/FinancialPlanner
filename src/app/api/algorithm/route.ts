import { NextResponse } from 'next/server';
import { runAlgorithm, chartData } from './Algorithm.js';

export async function POST(request: Request) {
  try {
    // Parse the incoming JSON
    const simulationData = await request.json();
    const { scenario, numberOfSimulations } = simulationData;

    // console.log(numberOfSimulations);
    // console.log(scenario);

    // Run the simulation algorithm multiple times.
    const simulationResults = await runAlgorithm(scenario, Number(numberOfSimulations));

    // Return the simulation results in the response.
    return NextResponse.json({ result: simulationResults, chartData }, { status: 200 });
  } 
  catch (error: any) {
    console.error('Simulation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

// GET endpoint that returns the in-memory chartData
export async function GET(request: Request) {
  //console.log("hi1");
  //console.log(chartData);
  //console.log("hi2");
  return NextResponse.json({ chartData }, { status: 200 })
}