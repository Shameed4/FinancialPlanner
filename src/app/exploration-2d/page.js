'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import pageVariants from "../components/PageAnimation";
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LineChart } from '@mui/x-charts/LineChart';

// Helper function to format currency values
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

// Card component representing a single scenario
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

const Exploration2DPage = () => {
    const router = useRouter();
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [scenarios, setScenarios] = useState([]);
    const [parameterA, setParameterA] = useState('eventSeriesTiming');
    const [parameterB, setParameterB] = useState('eventSeriesAmount');

    // Parameter A ranges
    const [paramARangeMin, setParamARangeMin] = useState(2023);
    const [paramARangeMax, setParamARangeMax] = useState(2030);
    const [paramARangeStep, setParamARangeStep] = useState(1);

    // Parameter B ranges
    const [paramBRangeMin, setParamBRangeMin] = useState(0);
    const [paramBRangeMax, setParamBRangeMax] = useState(50000);
    const [paramBRangeStep, setParamBRangeStep] = useState(5000);

    // Simulation count
    const [simulationCount, setSimulationCount] = useState(1);

    // State for feedback and processing
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // State for exploration results
    const [explorationResults, setExplorationResults] = useState(null);

    // Event series selection state for Parameter A
    const [selectedEventSeriesIndexA, setSelectedEventSeriesIndexA] = useState(-1);
    const [selectedEventSeriesA, setSelectedEventSeriesA] = useState(null);
    const [eventSeriesModifyAttributeA, setEventSeriesModifyAttributeA] = useState('startYear'); // 'startYear' or 'duration'

    // Event series selection state for Parameter B
    const [selectedEventSeriesIndexB, setSelectedEventSeriesIndexB] = useState(-1);
    const [selectedEventSeriesB, setSelectedEventSeriesB] = useState(null);

    const { data: session } = useSession();

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

    // Parameters that can be explored
    const explorationParameters = [
        { id: 'eventSeriesTiming', name: 'Event Series Timing', min: 2023, max: 2050, step: 1 },
        { id: 'eventSeriesAmount', name: 'Event Series Amount', min: 0, max: 500000, step: 5000 },
        { id: 'allocations', name: 'Allocations', min: 0, max: 100, step: 5 },
    ];

    // Update parameter A range when parameter changes
    useEffect(() => {
        const selectedParam = explorationParameters.find(p => p.id === parameterA);
        if (selectedParam) {
            setParamARangeMin(selectedParam.min);
            setParamARangeMax(selectedParam.max);
            setParamARangeStep(selectedParam.step);
        }

        // Initialize event series for parameter A
        if (parameterA === 'eventSeriesTiming' && selectedScenario) {
            // Default to first event series if available
            if (selectedScenario.eventSeries && selectedScenario.eventSeries.length > 0) {
                const firstEventSeries = selectedScenario.eventSeries[0];
                setSelectedEventSeriesA(firstEventSeries);
                setSelectedEventSeriesIndexA(0);
                setEventSeriesModifyAttributeA('startYear');

                // Set initial bounds based on the selected event series
                const currentStartYear = firstEventSeries.startYear || new Date().getFullYear();
                setParamARangeMin(currentStartYear);
                setParamARangeMax(currentStartYear + 10);
            } else {
                setSelectedEventSeriesA(null);
                setSelectedEventSeriesIndexA(-1);
            }
        } else if (parameterA === 'eventSeriesAmount' && selectedScenario) {
            // Find first income or expense event series
            const incomeOrExpenseSeries = selectedScenario.eventSeries?.find(
                es => es.type === 'income' || es.type === 'expense'
            );

            if (incomeOrExpenseSeries) {
                const index = selectedScenario.eventSeries.indexOf(incomeOrExpenseSeries);
                setSelectedEventSeriesA(incomeOrExpenseSeries);
                setSelectedEventSeriesIndexA(index);

                // Set bounds based on the current amount
                const currentAmount = incomeOrExpenseSeries.initialAmount || 0;
                setParamARangeMin(currentAmount);
                setParamARangeMax(currentAmount * 2); // Double as upper bound
                setParamARangeStep(Math.round(currentAmount / 5)); // Default step size to 1/5 of amount
            } else {
                setSelectedEventSeriesA(null);
                setSelectedEventSeriesIndexA(-1);
            }
        }
    }, [parameterA, selectedScenario]);

    // Update parameter B range when parameter changes
    useEffect(() => {
        const selectedParam = explorationParameters.find(p => p.id === parameterB);
        if (selectedParam) {
            setParamBRangeMin(selectedParam.min);
            setParamBRangeMax(selectedParam.max);
            setParamBRangeStep(selectedParam.step);
        }

        // Initialize event series for parameter B
        if (parameterB === 'eventSeriesTiming' && selectedScenario) {
            // Default to first event series if available
            if (selectedScenario.eventSeries && selectedScenario.eventSeries.length > 0) {
                // Try to pick a different event series than parameter A
                let eventSeries = selectedScenario.eventSeries[0];
                let index = 0;

                if (selectedEventSeriesIndexA !== -1 && selectedScenario.eventSeries.length > 1) {
                    // Find a different event series
                    const differentEventSeries = selectedScenario.eventSeries.find((es, idx) =>
                        idx !== selectedEventSeriesIndexA
                    );

                    if (differentEventSeries) {
                        eventSeries = differentEventSeries;
                        index = selectedScenario.eventSeries.indexOf(differentEventSeries);
                    }
                }

                setSelectedEventSeriesB(eventSeries);
                setSelectedEventSeriesIndexB(index);

                // Set initial bounds based on the selected event series
                const currentStartYear = eventSeries.startYear || new Date().getFullYear();
                setParamBRangeMin(currentStartYear);
                setParamBRangeMax(currentStartYear + 10);
            } else {
                setSelectedEventSeriesB(null);
                setSelectedEventSeriesIndexB(-1);
            }
        } else if (parameterB === 'eventSeriesAmount' && selectedScenario) {
            // Find first income or expense event series different from parameter A
            let incomeOrExpenseSeries;

            if (selectedEventSeriesIndexA !== -1 && parameterA === 'eventSeriesAmount') {
                // Find a different event series
                incomeOrExpenseSeries = selectedScenario.eventSeries?.find(
                    (es, idx) => (es.type === 'income' || es.type === 'expense') &&
                        idx !== selectedEventSeriesIndexA
                );
            } else {
                incomeOrExpenseSeries = selectedScenario.eventSeries?.find(
                    es => es.type === 'income' || es.type === 'expense'
                );
            }

            if (incomeOrExpenseSeries) {
                const index = selectedScenario.eventSeries.indexOf(incomeOrExpenseSeries);
                setSelectedEventSeriesB(incomeOrExpenseSeries);
                setSelectedEventSeriesIndexB(index);

                // Set bounds based on the current amount
                const currentAmount = incomeOrExpenseSeries.initialAmount || 0;
                setParamBRangeMin(currentAmount);
                setParamBRangeMax(currentAmount * 2);
                setParamBRangeStep(Math.round(currentAmount / 5));
            } else {
                setSelectedEventSeriesB(null);
                setSelectedEventSeriesIndexB(-1);
            }
        }
    }, [parameterB, selectedScenario, parameterA, selectedEventSeriesIndexA]);

    // Handle scenario selection
    const handleScenarioSelect = (scenario) => {
        setSelectedScenario(scenario);
        console.log('Selected scenario:', scenario.name);

        // Reset event series indices
        setSelectedEventSeriesIndexA(-1);
        setSelectedEventSeriesIndexB(-1);
        setSelectedEventSeriesA(null);
        setSelectedEventSeriesB(null);
    };

    // Calculate all possible combinations of parameter values
    const generateParameterCombinations = () => {
        // Generate values for parameter A
        const valuesA = [];
        for (let value = paramARangeMin; value <= paramARangeMax; value += paramARangeStep) {
            valuesA.push(Math.round(value));

            // Safety check to prevent too many values
            if (valuesA.length >= 10) {
                break;
            }
        }

        // Make sure max value is included
        if (valuesA[valuesA.length - 1] !== paramARangeMax) {
            valuesA.push(paramARangeMax);
        }

        // Generate values for parameter B
        const valuesB = [];
        for (let value = paramBRangeMin; value <= paramBRangeMax; value += paramBRangeStep) {
            valuesB.push(Math.round(value));

            // Safety check to prevent too many values
            if (valuesB.length >= 10) {
                break;
            }
        }

        // Make sure max value is included
        if (valuesB[valuesB.length - 1] !== paramBRangeMax) {
            valuesB.push(paramBRangeMax);
        }

        // Remove duplicates
        const uniqueValuesA = [...new Set(valuesA)];
        const uniqueValuesB = [...new Set(valuesB)];

        console.log('Parameter A values:', uniqueValuesA);
        console.log('Parameter B values:', uniqueValuesB);
        console.log('Total combinations:', uniqueValuesA.length * uniqueValuesB.length);

        return {
            valuesA: uniqueValuesA,
            valuesB: uniqueValuesB
        };
    };

    // Handle exploration
    const handleExploreClick = () => {
        // Clear any previous feedback
        setFeedbackMessage('');

        if (!selectedScenario) {
            setFeedbackMessage('Please select a scenario to explore');
            return;
        }

        // Generate all parameter value combinations
        const { valuesA, valuesB } = generateParameterCombinations();

        // Create scenarios for all combinations
        const scenarios = [];

        // Log the parameter details for clarity
        console.log(`Parameter A (${parameterA}): Values [${valuesA.join(', ')}], EventSeriesIndex: ${selectedEventSeriesIndexA}`);
        console.log(`Parameter B (${parameterB}): Values [${valuesB.join(', ')}], EventSeriesIndex: ${selectedEventSeriesIndexB}`);

        // Create all combinations of scenarios
        valuesA.forEach(valueA => {
            valuesB.forEach(valueB => {
                // Create a deep copy of the scenario
                const modifiedScenario = JSON.parse(JSON.stringify(selectedScenario));

                // Modify parameter A
                modifyScenario(modifiedScenario, parameterA, valueA, selectedEventSeriesIndexA, eventSeriesModifyAttributeA);

                // Modify parameter B
                modifyScenario(modifiedScenario, parameterB, valueB, selectedEventSeriesIndexB);

                // Add descriptive name based on what was modified
                let paramADesc = '';
                let paramBDesc = '';

                // Get descriptive names for parameters based on type
                if (parameterA === 'eventSeriesTiming') {
                    const seriesName = selectedEventSeriesA?.name || selectedEventSeriesA?.title || 'Event';
                    const attribute = eventSeriesModifyAttributeA === 'startYear' ? 'StartYear' : 'Duration';
                    paramADesc = `${seriesName} ${attribute}=${valueA}`;
                } else if (parameterA === 'eventSeriesAmount') {
                    const seriesName = selectedEventSeriesA?.name || selectedEventSeriesA?.title || 'Event';
                    paramADesc = `${seriesName} Amount=${formatCurrency(valueA)}`;
                } else {
                    paramADesc = `${parameterA}=${valueA}`;
                }

                if (parameterB === 'eventSeriesTiming') {
                    const seriesName = selectedEventSeriesB?.name || selectedEventSeriesB?.title || 'Event';
                    paramBDesc = `${seriesName} StartYear=${valueB}`;
                } else if (parameterB === 'eventSeriesAmount') {
                    const seriesName = selectedEventSeriesB?.name || selectedEventSeriesB?.title || 'Event';
                    paramBDesc = `${seriesName} Amount=${formatCurrency(valueB)}`;
                } else {
                    paramBDesc = `${parameterB}=${valueB}`;
                }

                modifiedScenario.name = `${selectedScenario.name} (${paramADesc}, ${paramBDesc})`;

                // Add to scenarios array
                scenarios.push({
                    parameterValues: {
                        [parameterA]: valueA,
                        [parameterB]: valueB
                    },
                    scenario: modifiedScenario
                });
            });
        });

        // Show loading state
        setIsProcessing(true);
        setFeedbackMessage(`Generated ${scenarios.length} scenarios with all parameter combinations`);

        // Prepare data for display
        const exploreData = {
            scenarios: scenarios,
            simulationCount: simulationCount,
            parameterInfo: {
                parameterA: {
                    id: parameterA,
                    name: explorationParameters.find(p => p.id === parameterA)?.name || parameterA,
                    values: valuesA
                },
                parameterB: {
                    id: parameterB,
                    name: explorationParameters.find(p => p.id === parameterB)?.name || parameterB,
                    values: valuesB
                }
            }
        };

        // Log the created scenarios for debugging
        console.log('2D Exploration Data:', exploreData);

        // Display details about all generated scenarios
        const scenarioTable = scenarios.map((item, index) => {
            return {
                index,
                paramA: item.parameterValues[parameterA],
                paramB: item.parameterValues[parameterB],
                name: item.scenario.name
            };
        });

        console.table(scenarioTable);

        // Show success message
        setTimeout(() => {
            setIsProcessing(false);
            setFeedbackMessage(`Successfully created ${scenarios.length} scenario combinations for exploration. 
                Check browser console to see all combinations.`);
        }, 1000);

        // For now, store the exploration results in state for potential visualization later
        setExplorationResults({
            parameterA: {
                id: parameterA,
                values: valuesA
            },
            parameterB: {
                id: parameterB,
                values: valuesB
            },
            scenarios: scenarioTable
        });
    };

    // Helper function to modify a scenario based on the parameter type
    const modifyScenario = (scenario, paramType, value, eventSeriesIndex, modifyAttribute = 'startYear') => {
        switch (paramType) {
            case 'eventSeriesTiming':
                // Find the event series to modify
                if (eventSeriesIndex !== -1 && eventSeriesIndex < scenario.eventSeries.length) {
                    const targetEventSeries = scenario.eventSeries[eventSeriesIndex];

                    // Modify based on attribute (startYear or duration)
                    if (modifyAttribute === 'startYear') {
                        targetEventSeries.startYear = value;
                        targetEventSeries.startYearType = 'fixed';
                        console.log(`Modified scenario: ${scenario.name}, Event series #${eventSeriesIndex}, Set startYear=${value}`);
                    } else if (modifyAttribute === 'duration') {
                        targetEventSeries.durationFixed = value;
                        targetEventSeries.durationType = 'fixed';
                        console.log(`Modified scenario: ${scenario.name}, Event series #${eventSeriesIndex}, Set duration=${value}`);
                    }
                } else {
                    console.warn(`Invalid event series index: ${eventSeriesIndex}`);
                }
                break;

            case 'eventSeriesAmount':
                // Find the event series to modify
                if (eventSeriesIndex !== -1 && eventSeriesIndex < scenario.eventSeries.length) {
                    const targetEventSeries = scenario.eventSeries[eventSeriesIndex];
                    targetEventSeries.initialAmount = value;
                    targetEventSeries.amount = value;
                    console.log(`Modified scenario: ${scenario.name}, Event series #${eventSeriesIndex}, Set amount=${value}`);
                } else {
                    console.warn(`Invalid event series index: ${eventSeriesIndex}`);
                }
                break;

            case 'allocations':
                // Find an invest type event
                const investEvent = scenario.eventSeries.find(es => es.type === 'invest');

                if (investEvent && investEvent.initialAllocations) {
                    const allocationKeys = Object.keys(investEvent.initialAllocations);

                    if (allocationKeys.length >= 2) {
                        // Set the first allocation to the value
                        investEvent.initialAllocations[allocationKeys[0]] = value;
                        // Set the second allocation to the complement
                        investEvent.initialAllocations[allocationKeys[1]] = 100 - value;
                        console.log(`Modified scenario: ${scenario.name}, Investment allocations: ${allocationKeys[0]}=${value}%, ${allocationKeys[1]}=${100 - value}%`);
                    }
                }
                break;

            case 'rothConversion':
                // Toggle Roth conversion setting
                scenario.enableTaxOptimization = value === 1 || value === true;

                if (scenario.enableTaxOptimization) {
                    // Set default values if they don't exist
                    if (!scenario.rothOptimizationStartYear || !scenario.rothOptimizationEndYear) {
                        const currentYear = new Date().getFullYear();
                        scenario.rothOptimizationStartYear = String(currentYear);
                        scenario.rothOptimizationEndYear = String(currentYear + 20);
                    }
                } else {
                    // Disable by setting to null
                    scenario.rothOptimizationStartYear = null;
                    scenario.rothOptimizationEndYear = null;
                }
                console.log(`Modified scenario: ${scenario.name}, Roth Conversion=${scenario.enableTaxOptimization}`);
                break;
        }

        return scenario;
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 relative"
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">2D Parameter Exploration</h1>
                <button
                    onClick={() => router.push('/simulation')}
                    className="px-6 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
                >
                    Back to Simulation
                </button>
            </div>

            {scenarios.length > 0 ? (
                <div className="space-y-8">
                    {/* Section for selecting a saved scenario */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">Select a Scenario to Explore</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {scenarios.map((scenario) => (
                                <ScenarioCard
                                    key={scenario.id}
                                    scenario={scenario}
                                    isSelected={selectedScenario?.id === scenario.id}
                                    onClick={() => handleScenarioSelect(scenario)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Parameter selection */}
                    {selectedScenario && (
                        <div className="max-w-4xl">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">Select Parameters to Explore</h2>
                            <div className="space-y-6">
                                {/* Parameters A and B side by side */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Parameter A */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Parameter A
                                            </label>
                                            <select
                                                value={parameterA}
                                                onChange={(e) => setParameterA(e.target.value)}
                                                className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                {explorationParameters.map(param => (
                                                    <option key={param.id} value={param.id}>
                                                        {param.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Event Series specific options for Parameter A */}
                                        {(parameterA === 'eventSeriesTiming' || parameterA === 'eventSeriesAmount') && (
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Event Series for Parameter A
                                                </label>
                                                <select
                                                    value={selectedEventSeriesIndexA}
                                                    onChange={(e) => {
                                                        const index = parseInt(e.target.value);
                                                        const series = selectedScenario.eventSeries[index];
                                                        setSelectedEventSeriesA(series);
                                                        setSelectedEventSeriesIndexA(index);

                                                        // Update bounds based on the selected event series
                                                        if (parameterA === 'eventSeriesTiming') {
                                                            const currentStartYear = series.startYear || new Date().getFullYear();
                                                            setParamARangeMin(currentStartYear);
                                                            setParamARangeMax(currentStartYear + 10);
                                                        } else if (parameterA === 'eventSeriesAmount') {
                                                            const currentAmount = series.initialAmount || 0;
                                                            setParamARangeMin(currentAmount);
                                                            setParamARangeMax(currentAmount * 2);
                                                            setParamARangeStep(Math.max(1, Math.round(currentAmount / 5)));
                                                        }
                                                    }}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    {selectedScenario.eventSeries && selectedScenario.eventSeries
                                                        .filter(eventSeries =>
                                                            parameterA === 'eventSeriesTiming' ||
                                                            (parameterA === 'eventSeriesAmount' &&
                                                                (eventSeries.type === 'income' || eventSeries.type === 'expense'))
                                                        )
                                                        .map((eventSeries, idx) => {
                                                            // Find the actual index in the original array
                                                            const originalIndex = selectedScenario.eventSeries.indexOf(eventSeries);
                                                            return (
                                                                <option key={eventSeries.name || idx} value={originalIndex}>
                                                                    {eventSeries.name || eventSeries.title || `Event ${originalIndex + 1}`}
                                                                    {eventSeries.type ? ` (${eventSeries.type})` : ''}
                                                                </option>
                                                            );
                                                        })
                                                    }
                                                </select>
                                            </div>
                                        )}

                                        {/* Start Year or Duration selection for Parameter A */}
                                        {parameterA === 'eventSeriesTiming' && selectedEventSeriesA && (
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Attribute to Modify
                                                </label>
                                                <select
                                                    value={eventSeriesModifyAttributeA}
                                                    onChange={(e) => {
                                                        setEventSeriesModifyAttributeA(e.target.value);
                                                        // Update ranges based on the selected attribute
                                                        if (e.target.value === 'startYear') {
                                                            const currentStartYear = selectedEventSeriesA.startYear || new Date().getFullYear();
                                                            setParamARangeMin(currentStartYear);
                                                            setParamARangeMax(currentStartYear + 10);
                                                        } else if (e.target.value === 'duration') {
                                                            const currentDuration = selectedEventSeriesA.durationFixed || 10;
                                                            setParamARangeMin(currentDuration);
                                                            setParamARangeMax(currentDuration + 10);
                                                        }
                                                    }}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="startYear">Start Year</option>
                                                    <option value="duration">Duration</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Parameter A range */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Parameter A Range
                                            </label>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Min</label>
                                                    <input
                                                        type="number"
                                                        value={paramARangeMin}
                                                        onChange={(e) => setParamARangeMin(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Max</label>
                                                    <input
                                                        type="number"
                                                        value={paramARangeMax}
                                                        onChange={(e) => setParamARangeMax(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Step</label>
                                                    <input
                                                        type="number"
                                                        value={paramARangeStep}
                                                        onChange={(e) => setParamARangeStep(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parameter B */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Parameter B
                                            </label>
                                            <select
                                                value={parameterB}
                                                onChange={(e) => setParameterB(e.target.value)}
                                                className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                {explorationParameters
                                                    .filter(param => param.id !== parameterA) // Prevent selecting the same parameter
                                                    .map(param => (
                                                        <option key={param.id} value={param.id}>
                                                            {param.name}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        {/* Event Series specific options for Parameter B */}
                                        {(parameterB === 'eventSeriesTiming' || parameterB === 'eventSeriesAmount') && (
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Event Series for Parameter B
                                                </label>
                                                <select
                                                    value={selectedEventSeriesIndexB}
                                                    onChange={(e) => {
                                                        const index = parseInt(e.target.value);
                                                        const series = selectedScenario.eventSeries[index];
                                                        setSelectedEventSeriesB(series);
                                                        setSelectedEventSeriesIndexB(index);

                                                        // Update bounds based on the selected event series
                                                        if (parameterB === 'eventSeriesTiming') {
                                                            const currentStartYear = series.startYear || new Date().getFullYear();
                                                            setParamBRangeMin(currentStartYear);
                                                            setParamBRangeMax(currentStartYear + 10);
                                                        } else if (parameterB === 'eventSeriesAmount') {
                                                            const currentAmount = series.initialAmount || 0;
                                                            setParamBRangeMin(currentAmount);
                                                            setParamBRangeMax(currentAmount * 2);
                                                            setParamBRangeStep(Math.max(1, Math.round(currentAmount / 5)));
                                                        }
                                                    }}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    {selectedScenario.eventSeries && selectedScenario.eventSeries
                                                        .filter(eventSeries =>
                                                            // For parameter B, don't show the event series used in parameter A
                                                            eventSeries !== selectedEventSeriesA &&
                                                            (parameterB === 'eventSeriesTiming' ||
                                                                (parameterB === 'eventSeriesAmount' &&
                                                                    (eventSeries.type === 'income' || eventSeries.type === 'expense')))
                                                        )
                                                        .map((eventSeries, idx) => {
                                                            // Find the actual index in the original array
                                                            const originalIndex = selectedScenario.eventSeries.indexOf(eventSeries);
                                                            return (
                                                                <option key={eventSeries.name || idx} value={originalIndex}>
                                                                    {eventSeries.name || eventSeries.title || `Event ${originalIndex + 1}`}
                                                                    {eventSeries.type ? ` (${eventSeries.type})` : ''}
                                                                </option>
                                                            );
                                                        })
                                                    }
                                                </select>
                                            </div>
                                        )}

                                        {/* Parameter B range */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Parameter B Range
                                            </label>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Min</label>
                                                    <input
                                                        type="number"
                                                        value={paramBRangeMin}
                                                        onChange={(e) => setParamBRangeMin(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Max</label>
                                                    <input
                                                        type="number"
                                                        value={paramBRangeMax}
                                                        onChange={(e) => setParamBRangeMax(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Step</label>
                                                    <input
                                                        type="number"
                                                        value={paramBRangeStep}
                                                        onChange={(e) => setParamBRangeStep(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Simulation count field */}
                                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                    <h3 className="font-medium mb-2">Simulation Settings</h3>
                                    <div className="flex items-center">
                                        <label className="w-40 text-sm">Simulation Count:</label>
                                        <input
                                            type="number"
                                            value={simulationCount}
                                            onChange={(e) => setSimulationCount(Math.max(1, parseInt(e.target.value) || 1))}
                                            min="1"
                                            max="1000"
                                            className="w-32 p-2 border rounded-md bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <p className="ml-4 text-xs text-gray-500">Number of simulations to run for each combination</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Button to run the exploration */}
                    {selectedScenario && (
                        <div className="flex flex-col">
                            {/* Feedback message */}
                            {feedbackMessage && (
                                <div className={`p-4 mb-4 rounded-md ${isProcessing ? 'bg-blue-50 text-blue-800' : feedbackMessage.includes('Success') ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                                    <div className="flex">
                                        {isProcessing && (
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        <p>{feedbackMessage}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    className={`px-8 py-3 rounded-md font-medium ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 cursor-pointer'} transition-colors duration-200`}
                                    onClick={handleExploreClick}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Explore Parameters'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <p className="text-lg text-gray-700 mb-4">Create a scenario first to explore parameters</p>
                    <button
                        onClick={() => router.push('/scenario')}
                        className="px-6 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
                    >
                        Create a Scenario
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default Exploration2DPage;
