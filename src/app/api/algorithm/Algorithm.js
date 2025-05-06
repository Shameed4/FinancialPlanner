import runSimulation from './Simulation.js';
import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { fileURLToPath, pathToFileURL } from 'url';
import pLimit from 'p-limit';

// __filename and __dirname polyfill for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize chartData
export const chartData = {};

// Paths for chart data persistence
const CHART_DATA_PATH = path.join(process.cwd(), 'data');
const CHART_DATA_FILE = path.join(CHART_DATA_PATH, 'chart-data.json');

// Save chart data to file system
export function saveChartData() {
  try {
    if (!fs.existsSync(CHART_DATA_PATH)) {
      fs.mkdirSync(CHART_DATA_PATH, { recursive: true });
    }
    fs.writeFileSync(CHART_DATA_FILE, JSON.stringify(chartData, null, 2));
    console.log('Chart data saved to file system');
    return true;
  } catch (error) {
    //console.error('Error saving chart data:', error);
    return false;
  }
}

// Load chart data from file system
export function loadChartData() {
  try {
    if (fs.existsSync(CHART_DATA_FILE)) {
      const data = fs.readFileSync(CHART_DATA_FILE, 'utf8');
      Object.assign(chartData, JSON.parse(data));
      console.log('Chart data loaded from file system');
      return chartData;
    }
  } catch (error) {
    //console.error('Error loading chart data:', error);
  }
  return chartData;
}

// Load existing data on initialization
loadChartData();

// Helper: run a simulation in a worker thread
function runSimulationInWorker(data, userName, generateLog) {
  return new Promise((resolve, reject) => {
    const workerPath = pathToFileURL(path.join(__dirname, 'simulationWorker.js'));
    const worker = new Worker(workerPath, {
      workerData: { data, userName, generateLog },
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

// Multithreaded runAlgorithm
export async function runAlgorithm(selectedScenarioData, numSimulations, threads, userName) {
  const scenarioId = selectedScenarioData.id;
  const simulationResults = {};
  const scenarioKey = `Scenario ID ${scenarioId}`;

  delete chartData[scenarioKey];
  chartData.lastUpdatedScenario = scenarioKey;
  chartData.lastUpdatedTimestamp = new Date().toISOString();

  const limit = pLimit(threads);

  const simulations = Array.from({ length: numSimulations }, (_, i) => {
    const generateLog = i === 0;
    return limit(() =>
      runSimulationInWorker(selectedScenarioData, userName, generateLog)
        .then((result) => {
          simulationResults[`Simulation ${i + 1}`] = result;
          console.log(`Simulation ${i + 1} completed`);
        })
    );
  });

  await Promise.all(simulations);

  chartData[scenarioKey] = simulationResults;
  chartData.lastUpdated = new Date().toISOString();
  saveChartData();

  return simulationResults;
}