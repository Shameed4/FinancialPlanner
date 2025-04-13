import runSimulation from './Simulation.js';

export default function runAlgorithm(selectedScenarioData, numSimulations) {
  const simulationResults = [];

  for (let i = 0; i < numSimulations; i++) {
    // Each call simulates one full run of your algorithm.
    const result = runSimulation(selectedScenarioData);
    simulationResults.push(result);
  }

  return simulationResults;
}