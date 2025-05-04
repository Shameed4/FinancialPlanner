

import { runAlgorithm, chartData } from '../algorithm/Algorithm.js';
import seedrandom from 'seedrandom';
import { deepCopy } from '../algorithm/GlobalFunctions.js'; // Keep deepCopy ONLY for the workaround


function aggregateSimulationResults(simulationResults, numberOfSimulations) {
    if (!simulationResults || typeof simulationResults !== 'object' || Object.keys(simulationResults).length === 0) {
        console.warn("Cannot aggregate empty or invalid simulation results.");
        return null;
    }

    const yearlySuccessProb = [];
    const yearlyMedianInvestments = [];
    const allYears = new Set();

    // Collect all years present in the results
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

    // Aggregate per year
    for (const year of sortedYears) {
        let successCount = 0;
        const investmentValues = [];
        let validSimsForYear = 0;

        // Iterate through each simulation run
        for (let i = 1; i <= numberOfSimulations; i++) {
            const simKey = `Simulation ${i}`;
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


export async function runScenarioComparison(baselineScenario, modifiedScenario, numberOfSimulations, baseSeed = 'comparison-' + Date.now()) {
    console.log("Starting Scenario Comparison...");
    const comparisonResults = {
        baseline: null,
        modified: null
    };

    // --- Consistent ID for Workaround ---
    // Use a unique ID for this comparison batch to retrieve results.
    const comparisonId = `comparison_batch_${Date.now()}`;
    const scenarioKey = `Scenario ID ${comparisonId}`; // Key runAlgorithm will use

    // --- Run Baseline Scenario ---
    console.log("\n--- Running Baseline Scenario ---");
    try {
        // 1. Assign ID
        baselineScenario.id = comparisonId;

        // 2. Seed PRNG for Baseline
        const baselineSeed = `${baseSeed}-baseline`;
        seedrandom(baselineSeed, { global: true });
        console.log(`Seeded PRNG for Baseline with: ${baselineSeed}`);

        // 3. Run Simulations
        console.log(`Calling runAlgorithm for Baseline...`);
        await runAlgorithm(baselineScenario, numberOfSimulations);
        console.log(`runAlgorithm completed for Baseline.`);

        // 4. Extract Results (Workaround)
        if (chartData && chartData[scenarioKey]) {
            const baselineRawResults = deepCopy(chartData[scenarioKey]);
            if (!baselineRawResults) throw new Error("Deep copy failed for baseline results.");
            console.log(`Successfully extracted baseline results from global chartData.`);
            // 5. Aggregate Baseline Results
            comparisonResults.baseline = aggregateSimulationResults(baselineRawResults, numberOfSimulations);
             if (!comparisonResults.baseline) throw new Error("Aggregation failed for baseline results.");
            console.log("Aggregated baseline results.");
            // delete chartData[scenarioKey]; // Optional cleanup
        } else {
            console.error(`Baseline results key "${scenarioKey}" not found in global chartData.`);
            throw new Error(`Baseline results key "${scenarioKey}" not found.`);
        }
    } catch (error) {
        console.error("Error processing baseline scenario:", error);
        comparisonResults.baseline = { error: `Baseline processing failed: ${error.message}` };
    }

    // --- Run Modified Scenario ---
    console.log("\n--- Running Modified Scenario ---");
    try {
        // 1. Assign ID (runAlgorithm will overwrite the entry in chartData)
        modifiedScenario.id = comparisonId;

        // 2. Seed PRNG for Modified (DIFFERENT SEED)
        const modifiedSeed = `${baseSeed}-modified`;
        seedrandom(modifiedSeed, { global: true });
        console.log(`Seeded PRNG for Modified with: ${modifiedSeed}`);

        // 3. Run Simulations
        console.log(`Calling runAlgorithm for Modified...`);
        await runAlgorithm(modifiedScenario, numberOfSimulations);
        console.log(`runAlgorithm completed for Modified.`);

        // 4. Extract Results (Workaround)
        if (chartData && chartData[scenarioKey]) {
            const modifiedRawResults = deepCopy(chartData[scenarioKey]);
             if (!modifiedRawResults) throw new Error("Deep copy failed for modified results.");
            console.log(`Successfully extracted modified results from global chartData.`);
            // 5. Aggregate Modified Results
            comparisonResults.modified = aggregateSimulationResults(modifiedRawResults, numberOfSimulations);
             if (!comparisonResults.modified) throw new Error("Aggregation failed for modified results.");
            console.log("Aggregated modified results.");
            // delete chartData[scenarioKey]; // Optional cleanup
        } else {
            console.error(`Modified results key "${scenarioKey}" not found in global chartData.`);
            throw new Error(`Modified results key "${scenarioKey}" not found.`);
        }
    } catch (error) {
        console.error("Error processing modified scenario:", error);
        comparisonResults.modified = { error: `Modified processing failed: ${error.message}` };
    }

    console.log("\nScenario Comparison Finished.");
    // **Reminder:** The file `chart-data.json` only contains data from the modified scenario run.
    return comparisonResults;
}
