import runSimulation from './Simulation.js';

export const chartData = {};

export async function runAlgorithm(selectedScenarioData, numSimulations) {
  let scenarioId = selectedScenarioData.id;
  const simulationResults = {};

  for (let i = 1; i < numSimulations + 1; i++) {
    simulationResults[`Simulation ${i}`] = {};

    const result = await runSimulation(selectedScenarioData);
    simulationResults[`Simulation ${i}`] = result;

    chartData[`Scenario ID ${scenarioId}`] = simulationResults;

    // console.log(chartData);
  }

  return simulationResults;
}