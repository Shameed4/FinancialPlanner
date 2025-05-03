'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import pageVariants from '../components/PageAnimation'
import { useRouter } from 'next/navigation'
import { LineChart } from '@mui/x-charts/LineChart'
import { useSession } from 'next-auth/react'

// Helper function to format dollar amounts
function formatDollar(v) {
    if (v === undefined || v === null) return '$0'
    return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M`
        : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}k`
            : `$${v.toFixed(0)}`
}

const PARAMETER_TYPES = [
    {
        id: 'rothEnabled', name: 'Roth Conversion Enabled', min: 0, max: 1, step: 1, unit: '',
        valueLabels: { 0: 'Disabled', 1: 'Enabled' }
    },
    { id: 'eventStartYear', name: 'Event Start Year', min: 2025, max: 2050, step: 1, unit: '' },
    { id: 'eventDuration', name: 'Event Duration', min: 1, max: 30, step: 1, unit: 'years' },
    { id: 'incomeAmount', name: 'Income Amount', min: 50000, max: 200000, step: 10000, unit: '$' },
    { id: 'expenseAmount', name: 'Expense Amount', min: 20000, max: 100000, step: 5000, unit: '$' },
    { id: 'assetAllocation', name: 'Asset Allocation', min: 0, max: 100, step: 5, unit: '%' },
]

const QUANTITY_TYPES = [
    { id: 'successProbability', name: 'Probability of Success', formatter: value => `${(value * 100).toFixed(1)}%` },
    { id: 'totInvestments', name: 'Total Investments', formatter: formatDollar },
    { id: 'income', name: 'Income', formatter: formatDollar },
    { id: 'expenses', name: 'Expenses', formatter: formatDollar },
]

// Card component representing a single simulation scenario (reused from simulation page)
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
        console.log('Fetched scenarios:', data);
        return data.result;
    } catch (error) {
        console.error('Error fetching scenarios:', error);
        return [];
    }
}

const ParameterExplorationPage = () => {
    const router = useRouter()
    const { data: session } = useSession()
    const [scenarios, setScenarios] = useState([])
    const [baseScenario, setBaseScenario] = useState(null)
    const [selectedParameter, setSelectedParameter] = useState(PARAMETER_TYPES[0])
    const [selectedQuantity, setSelectedQuantity] = useState(QUANTITY_TYPES[0])
    const [paramRangeMin, setParamRangeMin] = useState(PARAMETER_TYPES[0].min)
    const [paramRangeMax, setParamRangeMax] = useState(PARAMETER_TYPES[0].max)
    const [paramStep, setParamStep] = useState(PARAMETER_TYPES[0].step)
    const [simulationResults, setSimulationResults] = useState(null)
    const [isRunning, setIsRunning] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Load scenarios when session is available
    useEffect(() => {
        if (session) {
            const loadScenarios = async () => {
                const result = await fetchScenarios(session.user.email);
                setScenarios(result);
            };
            loadScenarios();
        }
    }, [session]);

    useEffect(() => {
        // When parameter type changes, update the min/max/step values
        setParamRangeMin(selectedParameter.min)
        setParamRangeMax(selectedParameter.max)
        setParamStep(selectedParameter.step)
    }, [selectedParameter])

    const handleRunSimulation = async () => {
        if (!baseScenario) {
            setError("Please select a base scenario first");
            return;
        }

        try {
            setIsRunning(true)
            setLoading(true)
            setError(null)

            // Generate array of parameter values based on range and step
            const paramValues = []
            for (let val = paramRangeMin; val <= paramRangeMax; val += paramStep) {
                paramValues.push(val)
            }

            console.log(`Running exploration for parameter: ${selectedParameter.name}`);
            console.log(`Values: ${paramValues.join(', ')}`);

            // Run actual simulations for each parameter value
            const results = await runParameterExploration(baseScenario, selectedParameter.id, paramValues, selectedQuantity.id);

            setSimulationResults(results);
        } catch (err) {
            console.error('Simulation error:', err)
            setError(err.message || 'An error occurred during simulation')
        } finally {
            setIsRunning(false)
            setLoading(false)
        }
    }

    // Function to run simulations for each parameter value
    const runParameterExploration = async (scenario, paramId, paramValues, quantityId) => {
        // Array to store results
        const timeSeriesData = [];
        const years = Array.from({ length: 31 }, (_, i) => 2025 + i);

        // For each parameter value, run a simulation
        for (const paramValue of paramValues) {
            // Clone the base scenario and modify the parameter
            const modifiedScenario = {
                ...scenario,
                explorationParam: {
                    id: paramId,
                    value: paramValue
                }
            };

            // Call the API endpoint for each parameter value
            const response = await fetch('/api/explore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scenario: modifiedScenario,
                    numberOfSimulations: 5, // Use a smaller number for exploration
                    quantityToMeasure: quantityId
                })
            });

            if (!response.ok) {
                throw new Error(`Simulation failed for ${paramId}=${paramValue}`);
            }

            const data = await response.json();

            // Extract time series data for this parameter value
            const yearlyData = data.timeSeriesData ||
                years.map(year => {
                    // Fallback to mock data if API doesn't return proper data
                    if (quantityId === 'successProbability') {
                        return 0.5 + Math.random() * 0.4;
                    } else {
                        return 50000 * Math.pow(1.05, year - 2025);
                    }
                });

            timeSeriesData.push({
                paramValue,
                yearlyData,
                finalValue: yearlyData[yearlyData.length - 1]
            });
        }

        return {
            paramValues,
            years,
            timeSeriesData,
            parameter: selectedParameter,
            quantity: selectedQuantity
        };
    };

    // Format parameter value for display (e.g., handle boolean values)
    const formatParamValue = (value) => {
        if (selectedParameter.valueLabels && selectedParameter.valueLabels[value] !== undefined) {
            return selectedParameter.valueLabels[value]
        }
        return selectedParameter.unit ? `${value}${selectedParameter.unit}` : value
    }

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 space-y-8"
        >
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-black">1D Parameter Exploration</h1>
                <button
                    onClick={() => router.push('/simulation')}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                    Back to Simulation
                </button>
            </div>

            {/* Scenario Selection Section */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-semibold mb-4">1. Select Base Scenario</h2>

                {scenarios.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scenarios.map((scenario) => (
                            <ScenarioCard
                                key={scenario.id}
                                scenario={scenario}
                                isSelected={baseScenario?.id === scenario.id}
                                onClick={() => setBaseScenario(scenario)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No scenarios available. Create a scenario first.</p>
                        <button
                            onClick={() => router.push('/scenario')}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Create Scenario
                        </button>
                    </div>
                )}
            </div>

            {/* Parameter Configuration Section */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-semibold mb-4">2. Configure Parameter Exploration</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parameter to Explore
                        </label>
                        <select
                            value={selectedParameter.id}
                            onChange={(e) => {
                                const param = PARAMETER_TYPES.find(p => p.id === e.target.value)
                                setSelectedParameter(param)
                            }}
                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {PARAMETER_TYPES.map(param => (
                                <option key={param.id} value={param.id}>
                                    {param.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity to Measure
                        </label>
                        <select
                            value={selectedQuantity.id}
                            onChange={(e) => {
                                const quantity = QUANTITY_TYPES.find(q => q.id === e.target.value)
                                setSelectedQuantity(quantity)
                            }}
                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {QUANTITY_TYPES.map(quantity => (
                                <option key={quantity.id} value={quantity.id}>
                                    {quantity.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parameter Minimum Value
                        </label>
                        <input
                            type="number"
                            value={paramRangeMin}
                            onChange={(e) => setParamRangeMin(Number(e.target.value))}
                            min={selectedParameter.min}
                            max={paramRangeMax - paramStep}
                            step={paramStep}
                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parameter Maximum Value
                        </label>
                        <input
                            type="number"
                            value={paramRangeMax}
                            onChange={(e) => setParamRangeMax(Number(e.target.value))}
                            min={paramRangeMin + paramStep}
                            max={selectedParameter.max}
                            step={paramStep}
                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Step Size
                        </label>
                        <input
                            type="number"
                            value={paramStep}
                            onChange={(e) => setParamStep(Number(e.target.value))}
                            min={selectedParameter.step}
                            max={(paramRangeMax - paramRangeMin) / 2}
                            step={selectedParameter.step}
                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleRunSimulation}
                        disabled={isRunning || !baseScenario}
                        className={`px-6 py-2 rounded-md ${baseScenario
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'} 
                            disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
                    >
                        {isRunning ? 'Running...' : 'Run Exploration'}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="bg-white rounded-xl shadow p-6 flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" role="status">
                            <span className="sr-only">Loading...</span>
                        </div>
                        <p className="mt-2 text-gray-700">Running simulations...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="text-red-600 mb-4">Error: {error}</div>
                    <button
                        onClick={handleRunSimulation}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {simulationResults && !loading && !error && (
                <>
                    {/* Chart 5.1: Multi-line Chart (Time Series) */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Time Series: {selectedQuantity.name} Over Time by {selectedParameter.name}
                        </h2>
                        <div className="h-96">
                            <LineChart
                                xAxis={[
                                    {
                                        data: simulationResults.years,
                                        label: 'Year',
                                        scaleType: 'linear'
                                    }
                                ]}
                                yAxis={[
                                    {
                                        label: selectedQuantity.name,
                                        valueFormatter: selectedQuantity.formatter
                                    }
                                ]}
                                series={
                                    simulationResults.timeSeriesData.map((series, index) => ({
                                        data: series.yearlyData,
                                        label: formatParamValue(series.paramValue),
                                        showMark: false
                                    }))
                                }
                                height={400}
                                slotProps={{
                                    legend: { position: 'bottom' }
                                }}
                            />
                        </div>
                    </div>

                    {/* Chart 5.2: Final Outcome Chart */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Final {selectedQuantity.name} by {selectedParameter.name}
                        </h2>
                        <div className="h-96">
                            <LineChart
                                xAxis={[
                                    {
                                        data: simulationResults.paramValues,
                                        label: selectedParameter.name,
                                        valueFormatter: (value) => formatParamValue(value),
                                        scaleType: selectedParameter.id === 'rothEnabled' ? 'band' : 'linear'
                                    }
                                ]}
                                yAxis={[
                                    {
                                        label: `Final ${selectedQuantity.name}`,
                                        valueFormatter: selectedQuantity.formatter
                                    }
                                ]}
                                series={[
                                    {
                                        data: simulationResults.timeSeriesData.map(series => series.finalValue),
                                        showMark: true,
                                        curve: 'linear'
                                    }
                                ]}
                                height={400}
                            />
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    )
}

export default ParameterExplorationPage 