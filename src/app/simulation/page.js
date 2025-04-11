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
function handleBeginSimulation(selectedScenario, numberOfSimulations, simulationType) {
    const simulationData = {
        scenario: selectedScenario,
        numberOfSimulations,
        simulationType
    };

    console.log(selectedScenario);

    // Send data to the fake endpoint
    fetch('/api/simulate', { // Replace with the actual endpoint
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(simulationData)
    })
        .then(response => response.json())
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
    const [simulationType, setSimulationType] = useState('');
    const [scenarios, setScenarios] = useState([]);
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
            className="p-8"
        >
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Simulation Type
                                </label>
                                <div className="relative">
                                    <select
                                        value={simulationType}
                                        onChange={(e) => setSimulationType(e.target.value)}
                                        className="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full px-4 py-2.5 pr-10 transition-all rounded-md"
                                    >
                                        <option value="">Select simulation type...</option>
                                        <option value="roth">Roth Optimizer</option>
                                        <option value="montecarlo">Monte Carlo</option>
                                    </select>

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
                            className={`px-8 py-3 rounded-md font-medium ${selectedScenario && simulationType
                                ? 'bg-black text-white hover:bg-gray-800 hover:cursor-pointer'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                } transition-colors duration-200`}
                            disabled={!selectedScenario || !simulationType}
                            onClick={() => handleBeginSimulation(selectedScenario, simulationCount, simulationType)}
                        >
                            Begin
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