// simulationWorker.js
import { parentPort, workerData } from 'worker_threads';
import runSimulation from './Simulation.js';

(async () => {
  const result = await runSimulation(workerData);
  if (parentPort !== null)
    parentPort.postMessage(result);
  else
    console.error("Parent port is null!");
})();
