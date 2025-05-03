'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import pageVariants from "../components/PageAnimation";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';


// Card component representing a single simulation scenario
const ScenarioCard = ({ scenario, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`p-4 rounded-xl transition-all transform shadow-sm hover:cursor-pointer ${isSelected
            ? 'bg-white text-gray-900 scale-[1.02] ring-2 ring-blue-500 ring-offset-2'
            : 'bg-white hover:bg-gray-50 hover:scale-[1.01]'
            }`}
    >
        <div className="relative h-32 w-full mb-4 rounded-lg overflow-hidden">
            <img
                src={`https://picsum.photos/seed/${scenario.name}/400/300`}
                alt={scenario.name}
                className="object-cover w-full h-full"
            />
            {isSelected && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
        </div>
        <div className="text-left">
            <h3 className="font-semibold text-lg text-gray-900">{scenario.name}</h3>
            <p className="text-sm text-gray-600">
                Retirement: {scenario.retirementDate}
            </p>
        </div>
    </button>
)

// Function to fetch scenarios from the backend
async function fetchScenarios(userEmail) {
    try {
        const response = await fetch(`/api/scenarios?ownerId=${userEmail}`);
        const data = await response.json();
        console.log('Fetched scenarios:', data); // Log the data
        return data.result;
    } catch (error) {
        console.error('Error fetching scenarios:', error);
        return [];
    }
}

// Function to handle the "Begin" button click
function handleBeginSimulation(selectedScenario, numberOfSimulations) {
    const simulationData = {
        scenario: selectedScenario,
        numberOfSimulations,
    };

    console.log(selectedScenario);

    // Send data to the fake endpoint
    fetch('/api/algorithm', { // Replace with the actual endpoint
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(simulationData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Simulation result:', data);
        })
        .catch(error => {
            console.error('Error during simulation:', error);
        });

    // Log the data being sent
    console.log('Sending simulation data:', simulationData);
}

const SimulationPage = () => {
    const router = useRouter();
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [simulationCount, setSimulationCount] = useState(5);
    const [scenarios, setScenarios] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const { data: session } = useSession();

    useEffect(() => {
        if (session) {
            const loadScenarios = async () => {
                const result = await fetchScenarios(session.user.email);
                setScenarios(result);
            };
            loadScenarios();
        }
    }, [session]);

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 relative"
        >
            {isRunning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl text-center">
                        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
                        <p className="text-lg font-semibold">Running simulation...</p>
                        <p className="text-sm text-gray-600 mt-2">This may take a few seconds</p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Your Scenario</h1>
                {scenarios.length === 0 && (
                    <button
                        onClick={() => router.push('/scenario')}
                        className="px-6 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
                    >
                        Create a Scenario
                    </button>
                )}
                {scenarios.length > 0 && (
                    <button
                        onClick={() => router.push('/exploration-1d')}
                        className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    >
                        Explore Parameters
                    </button>
                )}
            </div>

            {scenarios.length > 0 ? (
                <div className="space-y-8">
                    {/* Section for selecting a saved simulation scenario */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">Select a Saved Scenario</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {scenarios.map((scenario) => (
                                <ScenarioCard
                                    key={scenario.id}
                                    scenario={scenario}
                                    isSelected={selectedScenario?.id === scenario.id}
                                    onClick={() => setSelectedScenario(scenario)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Section for configuring simulation settings */}
                    <div className="max-w-xl">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Simulations
                                </label>
                                <input
                                    type="number"
                                    value={simulationCount}
                                    onChange={(e) => setSimulationCount(e.target.value)}
                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="5"
                                    min="1"
                                    max="100"
                                />
                            </div>

                            <div className="w-full max-w-md">
                                <div className="relative">

                                    {/* Dropdown Arrow */}
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-300">
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Button to begin the simulation, enabled only when a scenario and simulation type are selected */}
                    <div className="flex justify-end">
                        <button
                            className={`px-8 py-3 rounded-md font-medium ${selectedScenario ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} transition-colors duration-200`}
                            disabled={!selectedScenario}
                            onClick={async () => {
                                try {
                                    // Show loading overlay
                                    setIsRunning(true);

                                    // Show loading state on button
                                    const button = document.activeElement;
                                    if (button) {
                                        button.disabled = true;
                                        button.innerText = "Running...";
                                    }

                                    console.log("Starting simulation...");

                                    // 1) Run the simulation on the server
                                    const res = await fetch('/api/algorithm', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Cache-Control': 'no-cache'
                                        },
                                        cache: 'no-store',
                                        body: JSON.stringify({
                                            scenario: selectedScenario,
                                            numberOfSimulations: simulationCount
                                        }),
                                    });

                                    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

                                    // 2) Wait for the response and store the data
                                    const responseData = await res.json();
                                    console.log("Simulation completed successfully");

                                    // 3) Ensure we get valid data returned
                                    if (!responseData.timestamp) {
                                        throw new Error("Simulation completed but response is missing timestamp");
                                    }

                                    if (!responseData.chartData) {
                                        throw new Error("Simulation completed but chart data is missing");
                                    }

                                    const hasScenarioData = Object.keys(responseData.chartData)
                                        .some(key => key.startsWith('Scenario'));

                                    if (!hasScenarioData) {
                                        throw new Error("Simulation completed but no scenario data was generated");
                                    }

                                    console.log(`Simulation completed at ${responseData.timestamp}`);

                                    // Save data to session storage to ensure it's available after navigation
                                    try {
                                        sessionStorage.setItem('simulationData', JSON.stringify(responseData));
                                        console.log("Simulation data saved to session storage");
                                    } catch (storageErr) {
                                        console.warn("Failed to save to session storage:", storageErr);
                                        // Continue even if storage fails
                                    }

                                    // 4) Make a final GET request to ensure data is accessible
                                    console.log("Verifying data is accessible...");
                                    const verifyRes = await fetch('/api/algorithm', {
                                        cache: 'no-store',
                                        headers: { 'Cache-Control': 'no-cache' }
                                    });

                                    if (!verifyRes.ok) throw new Error(`Verification request failed: ${await verifyRes.text()}`);

                                    const verifyData = await verifyRes.json();

                                    if (!verifyData.chartData) {
                                        throw new Error("Verification failed: Response missing chart data");
                                    }

                                    const hasVerifiedScenarioData = Object.keys(verifyData.chartData)
                                        .some(key => key.startsWith('Scenario'));

                                    if (!hasVerifiedScenarioData) {
                                        throw new Error("Verification failed: No scenario data found");
                                    }

                                    console.log("Data verification successful, navigating to results...");

                                    // Reset button state before navigation
                                    if (button) {
                                        button.disabled = false;
                                        button.innerText = "Begin";
                                    }

                                    // Add a longer delay to ensure data is fully processed
                                    await new Promise(resolve => setTimeout(resolve, 1000));

                                    // 5) Navigate to results page with a query parameter to avoid caching issues
                                    const timestamp = new Date().getTime();
                                    router.push(`/charts-results?t=${timestamp}`);

                                } catch (err) {
                                    console.error('Simulation error:', err);

                                    // Hide loading overlay
                                    setIsRunning(false);

                                    // Reset button state if there's an error
                                    const button = document.activeElement;
                                    if (button) {
                                        button.disabled = false;
                                        button.innerText = "Begin";
                                    }

                                    alert(`Error running simulation: ${err.message}\n\nPlease try again.`);
                                }
                            }}
                        >
                            Begin
                        </button>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={() => router.push('/charts-results')}
                            className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        >
                            View Results
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <p className="text-lg text-gray-700 mb-4">Create a scenario first to run a simulation</p>
                </div>
            )}
        </motion.div>
    );
}

export default SimulationPage;