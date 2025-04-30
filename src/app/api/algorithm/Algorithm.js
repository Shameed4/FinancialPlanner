import runSimulation from './Simulation.js';

export default async function runAlgorithm(selectedScenarioData, numSimulations) {
  const simulationResults = {};

  for (let i = 0; i < numSimulations; i++) {
    simulationResults[`Simulation ${i}`] = {};

    const result = await runSimulation(selectedScenarioData);
    simulationResults[`Simulation ${i}`] = result;

    console.log(simulationResults);
  }

  return simulationResults;
}