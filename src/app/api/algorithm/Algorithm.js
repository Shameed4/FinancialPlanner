import runSimulation from './Simulation.js';
import fs from 'fs';
import path from 'path';

// Initialize chartData with an empty object to ensure it's defined
export const chartData = {};

// Path to store chart data
const CHART_DATA_PATH = path.join(process.cwd(), 'data');
const CHART_DATA_FILE = path.join(CHART_DATA_PATH, 'chart-data.json');

// Save chart data to file system for persistence
export function saveChartData() {
  try {
    // Ensure the directory exists
    if (!fs.existsSync(CHART_DATA_PATH)) {
      fs.mkdirSync(CHART_DATA_PATH, { recursive: true });
    }
    
    // Write the data to file
    fs.writeFileSync(CHART_DATA_FILE, JSON.stringify(chartData, null, 2));
    console.log("Chart data saved to file system");
    return true;
  } catch (error) {
    console.error("Error saving chart data:", error);
    return false;
  }
}

// Load chart data from file system
export function loadChartData() {
  try {
    if (fs.existsSync(CHART_DATA_FILE)) {
      const data = fs.readFileSync(CHART_DATA_FILE, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Merge into chartData
      Object.assign(chartData, parsedData);
      console.log("Chart data loaded from file system");
      return chartData;
    }
  } catch (error) {
    console.error("Error loading chart data:", error);
  }
  return chartData;
}

// Initialize by loading existing data
loadChartData();

export async function runAlgorithm(selectedScenarioData, numSimulations) {
  let scenarioId = selectedScenarioData.id;
  const simulationResults = {};

  // Format the scenario ID consistently
  const scenarioKey = `Scenario ID ${scenarioId}`;
  
  // Clear previous results for this scenario to ensure fresh data
  delete chartData[scenarioKey];

  // Add timestamp for when this scenario was run
  chartData.lastUpdatedScenario = scenarioKey;
  chartData.lastUpdatedTimestamp = new Date().toISOString();

  for (let i = 1; i < numSimulations + 1; i++) {
    simulationResults[`Simulation ${i}`] = {};

    const result = await runSimulation(selectedScenarioData);
    simulationResults[`Simulation ${i}`] = result;

    // Update chartData with the current simulation results
    chartData[scenarioKey] = simulationResults;

    console.log(`Simulation ${i} completed`);
  }

  // Add a timestamp to the chart data
  chartData.lastUpdated = new Date().toISOString();
  
  // Save data to file system for persistence
  saveChartData();
  
  return simulationResults;
}