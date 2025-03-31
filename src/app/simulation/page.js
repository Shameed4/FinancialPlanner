'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import pageVariants from "../components/PageAnimation";

// Card component representing a single simulation scenario
const ScenarioCard = ({ scenario, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`p-4 rounded-xl transition-all transform shadow-sm hover:cursor-pointer ${
            isSelected
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

const SimulationPage = () => {
    // Predefined simulation scenarios
    const scenarios = [
        { id: 1, name: "John's Plan", retirementDate: "2055" },
        { id: 2, name: "Jane's Plan", retirementDate: "2050" },
        { id: 3, name: "Family Plan", retirementDate: "2045" },
        { id: 4, name: "Early Retirement", retirementDate: "2040" },
        { id: 5, name: "Conservative Plan", retirementDate: "2060" },
        { id: 6, name: "Aggressive Plan", retirementDate: "2035" }
    ]

    // Local state for selected scenario, simulation count, and type
    const [selectedScenario, setSelectedScenario] = useState(null)
    const [simulationCount, setSimulationCount] = useState(5)
    const [simulationType, setSimulationType] = useState('')

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 max-w-6xl mx-auto"
        >
            <h1 className="text-3xl font-bold mb-8 text-gray-900">Start Simulation</h1>

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Simulation Type
                            </label>
                            <select
                                value={simulationType}
                                onChange={(e) => setSimulationType(e.target.value)}
                                className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select simulation type...</option>
                                <option value="roth">Roth Optimizer</option>
                                <option value="montecarlo">Monte Carlo</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Button to begin the simulation, enabled only when a scenario and simulation type are selected */}
                <div className="flex justify-end">
                    <button
                        className={`px-8 py-3 rounded-md font-medium ${
                            selectedScenario && simulationType
                                ? 'bg-black text-white hover:bg-gray-800 hover:cursor-pointer'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        } transition-colors duration-200`}
                        disabled={!selectedScenario || !simulationType}
                    >
                        Begin
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

export default SimulationPage
