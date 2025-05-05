import { runAlgorithm, chartData } from '../algorithm/Algorithm.js';
import seedrandom from 'seedrandom';
import { deepCopy } from '../algorithm/GlobalFunctions.js';

function aggregateSimulationResults(simulationResults, numberOfSimulations) {
    if (!simulationResults || typeof simulationResults !== 'object' || Object.keys(simulationResults).length === 0) {
        console.warn("Cannot aggregate empty or invalid simulation results.");
        return null;
    }

    const yearlySuccessProb = [];
    const yearlyMedianInvestments = [];
    const allYears = new Set();

    Object.values(simulationResults).forEach(sim => {
        if (sim && typeof sim === 'object') {
            Object.keys(sim).forEach(year => {
                const yearNum = parseInt(year);
                if (!isNaN(yearNum)) allYears.add(yearNum);
            });
        }
    });
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    if (sortedYears.length === 0) {
        console.warn(`No valid years found in simulation results.`);
        return { error: "No valid simulation years found." };
    }

    for (const year of sortedYears) {
        let successCount = 0;
        const investmentValues = [];
        let validSimsForYear = 0;

        // Iterate through each simulation run
        // Adjust loop to handle potential sparse results
        const simKeys = Object.keys(simulationResults);

        for (const simKey of simKeys) {
            const yearData = simulationResults[simKey]?.[year];
            if (yearData && typeof yearData === 'object') {
                validSimsForYear++;
                if (yearData.success === true) successCount++;
                investmentValues.push(Number(yearData.totInvestments) || 0);
            }
        }


        if (validSimsForYear > 0) {
            const prob = (successCount / validSimsForYear) * 100;
            yearlySuccessProb.push({ year: year, probability: prob });

            // Calculate median
            investmentValues.sort((a, b) => a - b);
            const medianIndex = Math.floor(investmentValues.length / 2);
            let median = 0;
            if (investmentValues.length > 0) {
                median = investmentValues.length % 2 === 0
                    ? (investmentValues[medianIndex - 1] + investmentValues[medianIndex]) / 2
                    : investmentValues[medianIndex];
            }
            yearlyMedianInvestments.push({ year: year, medianInvestment: median });
        } else {
            yearlySuccessProb.push({ year: year, probability: 0 });
            yearlyMedianInvestments.push({ year: year, medianInvestment: 0 });
        }
    }

    // Extract final values from the time series
    const finalSuccessProb = yearlySuccessProb[yearlySuccessProb.length - 1]?.probability ?? 0;
    const finalMedianInvest = yearlyMedianInvestments[yearlyMedianInvestments.length - 1]?.medianInvestment ?? 0;

    // Return the aggregated results
    return {
        successProbTimeSeries: yearlySuccessProb,
        medianInvestTimeSeries: yearlyMedianInvestments,
        finalSuccessProb: finalSuccessProb,
        finalMedianInvest: finalMedianInvest,
    };
}


export async function run2DExploration(explorationRuns, numberOfSimulationsInput, baseSeed = 'exploration-2d-' + Date.now()) {
    console.log("Starting 2D Exploration (Frontend handles modifications)...");
    // Structure results for easy plotting: { param1Value: { param2Value: { finalResult } } }
    const explorationResults = {};

    // Validate and ensure numberOfSimulations is at least 1
    const numberOfSimulations = Math.max(1, parseInt(numberOfSimulationsInput) || 10);
    if (numberOfSimulations !== numberOfSimulationsInput) {
        console.warn(`Corrected numberOfSimulations from ${numberOfSimulationsInput} to ${numberOfSimulations}`);
    }

    // Consistent ID for this batch run (for workaround)
    const explorationId = `exploration_2d_batch_${Date.now()}`;
    const scenarioKey = `Scenario ID ${explorationId}`;

    for (let runIndex = 0; runIndex < explorationRuns.length; runIndex++) {
        const run = explorationRuns[runIndex];
        // Validate input structure for 2D run
        if (!run || typeof run !== 'object' || typeof run.parameterValues !== 'object' || run.parameterValues === null || Object.keys(run.parameterValues).length !== 2 || typeof run.scenario !== 'object' || run.scenario === null) {
            console.error(`Invalid structure for 2D exploration run at index ${runIndex}. Skipping.`);
            continue;
        }

        const { parameterValues, scenario } = run;
        // Create a unique key for logging/debugging if needed, but structure results differently
        const comboKey = JSON.stringify(parameterValues); // Example key for logging

        console.log(`\n--- Running 2D Exploration: Combo = ${comboKey} (Index: ${runIndex}) ---`);

        // 1. Assign Consistent ID
        scenario.id = explorationId;

        // 2. Seed PRNG
        const currentSeed = `${baseSeed}-${runIndex}`;
        seedrandom(currentSeed, { global: true });
        console.log(`Seeded PRNG with: ${currentSeed}`);

        // 3. Run Simulation Set
        let parameterValueResults = null;
        let aggregatedData = null;
        try {
            // Pass the validated numberOfSimulations to runAlgorithm
            console.log(`Calling runAlgorithm for combo: ${comboKey} with ${numberOfSimulations} simulations...`);
            await runAlgorithm(scenario, numberOfSimulations, 4); // Updates global chartData
            console.log(`runAlgorithm completed for combo: ${comboKey}.`);

            // 4. Extract Results (Workaround)
            if (chartData && chartData[scenarioKey]) {
                parameterValueResults = deepCopy(chartData[scenarioKey]); // Extract results
                if (!parameterValueResults) throw new Error("Deep copy failed.");

                console.log(`--- Raw Results for Combo ${comboKey} ---`);
                console.log(JSON.stringify(parameterValueResults, null, 2));
                console.log(`--- End Raw Results ---`);
                console.log(`Extracted results from global chartData for key: ${scenarioKey}`);
                // delete chartData[scenarioKey]; // Optional cleanup

                // 5. Aggregate Results
                aggregatedData = aggregateSimulationResults(parameterValueResults, numberOfSimulations);
                if (!aggregatedData || aggregatedData.error) {
                    throw new Error(aggregatedData?.error || "Aggregation failed.");
                }
                console.log(`Aggregated results for combo: ${comboKey}`);

            } else {
                console.error(`Results key "${scenarioKey}" not found in global chartData after runAlgorithm completed. Current chartData keys:`, Object.keys(chartData || {}));
                throw new Error(`Results key "${scenarioKey}" not found.`);
            }
        } catch (error) {
            console.error(`Error during simulation/extraction/aggregation for combo ${comboKey}:`, error);
            // Create a unique string key for the error based on the combo
            const errorKey = `error_combo_${runIndex}`;
            explorationResults[errorKey] = {
                parameterValues: parameterValues, // Include context
                error: `Processing failed: ${error.message}`
            };
            continue; // Skip storing successful results for this combo
        }

        // 6. Store Aggregated FINAL Results for Plotting
        if (aggregatedData && !aggregatedData.error) {
            // Extract parameter names and values
            const paramPaths = Object.keys(parameterValues);

            const param1Path = paramPaths[0];
            const param2Path = paramPaths[1];
            const value1 = parameterValues[param1Path];
            const value2 = parameterValues[param2Path];

            // Use string keys for object structure consistency
            const key1 = String(value1);
            const key2 = String(value2);


            // The structure will be { param1Path: { value1: { param2Path: { value2: { result } } } } }
            if (!explorationResults[param1Path]) {
                explorationResults[param1Path] = {};
            }
            if (!explorationResults[param1Path][key1]) {
                explorationResults[param1Path][key1] = {};
            }
            if (!explorationResults[param1Path][key1][param2Path]) {
                explorationResults[param1Path][key1][param2Path] = {};
            }

            // Store only the final values needed for surface/contour plots
            explorationResults[param1Path][key1][param2Path][key2] = {
                finalSuccessProb: aggregatedData.finalSuccessProb,
                finalMedianInvest: aggregatedData.finalMedianInvest
            };
        }

        console.log(`--- Finished processing combo: ${comboKey} ---`);
    } // End of exploration runs loop

    console.log("2D Exploration Finished. Final results object generated.");
    return explorationResults;
}
