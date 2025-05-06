import { NextResponse } from 'next/server';
import { runAlgorithm, chartData, loadChartData, saveChartData } from './Algorithm.js';

// Load chart data at module initialization
loadChartData();

export async function POST(request: Request) {
  try {
    // Parse the incoming JSON
    const simulationData = await request.json();
    const { scenario, numberOfSimulations, userName } = simulationData;

    // Run the simulation algorithm multiple times.
    console.time('runAlgorithm');
    const simulationResults = await runAlgorithm(scenario, Number(numberOfSimulations), 4, userName);
    console.timeEnd('runAlgorithm');

    // Save chart data to ensure it's persisted (runAlgorithm already calls this, but double-check)
    saveChartData();

    // Return the simulation results in the response.
    return NextResponse.json({ 
      result: simulationResults, 
      chartData,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } 
  catch (error: any) {
    // console.error('Simulation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

// GET endpoint that returns the in-memory chartData
export async function GET(request: Request) {
  try {
    // Reload from file system to ensure we have the latest data
    loadChartData();
    
    // Return the chart data
    return NextResponse.json({ 
      chartData,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error: any) {
    // console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve chart data.' },
      { status: 500 }
    );
  }
}