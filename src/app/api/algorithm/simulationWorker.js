// simulationWorker.js
import { parentPort, workerData } from 'worker_threads';
import runSimulation from './Simulation.js';

(async () => {
  const { data, userName, generateLog } = workerData;
  const result = await runSimulation(data, userName, generateLog);
  if (parentPort !== null)
    parentPort.postMessage(result);
  else
    console.error("Parent port is null!");
})();
