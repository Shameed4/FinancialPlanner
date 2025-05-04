'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import pageVariants from '../components/PageAnimation'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Import helper functions
import { printObjectStructure, getNestedProperty, setNestedProperty, deepCopy } from './utils/objectHelpers'
import { fetchScenarios, sendExplorationData } from './utils/apiService'

// Import constants
import PARAMETER_TYPES from './constants/parameterTypes'

// Import components
import ScenarioCard from './components/ScenarioCard'
import {
    AssetAllocationInput,
    EventAmountInput,
    EventSeriesInput,
    RothConversionInput,
    GenericInput
} from './components/ParameterInputs'
import ApiResultDisplay from './components/ApiResultDisplay'
import ErrorDisplay from './components/ErrorDisplay'

const ParameterExplorationPage = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [scenarios, setScenarios] = useState([]);
    const [baseScenario, setBaseScenario] = useState(null);
    const [selectedParameter, setSelectedParameter] = useState(PARAMETER_TYPES[0]);
    const [paramValue, setParamValue] = useState(
        selectedParameter.type === 'boolean' ? 1 : selectedParameter.min
    );
    const [paramRangeMin, setParamRangeMin] = useState(
        selectedParameter.type === 'numeric' ? selectedParameter.min : 0
    );
    const [paramRangeMax, setParamRangeMax] = useState(
        selectedParameter.type === 'numeric' ? selectedParameter.max : 1
    );
    const [paramStep, setParamStep] = useState(
        selectedParameter.type === 'numeric' ? selectedParameter.step : 1
    );
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState(null);

    // Add state for Roth Conversion start and end years
    const [rothStartYear, setRothStartYear] = useState(2050);
    const [rothEndYear, setRothEndYear] = useState(2060);

    // Add state for event series modification
    const [selectedEventSeries, setSelectedEventSeries] = useState(null);
    const [selectedEventProperty, setSelectedEventProperty] = useState('startYear');
    const [eventSeriesNewValue, setEventSeriesNewValue] = useState(2025);

    // Add state for event series amount modification
    const [selectedAmountEventSeries, setSelectedAmountEventSeries] = useState(null);
    const [newInitialAmount, setNewInitialAmount] = useState(10000);

    // Add state for asset allocation modification
    const [selectedAllocationEvent, setSelectedAllocationEvent] = useState(null);
    const [firstInvestmentPercent, setFirstInvestmentPercent] = useState(50);
    const [finalFirstInvestmentPercent, setFinalFirstInvestmentPercent] = useState(50);
    const [firstInvestmentName, setFirstInvestmentName] = useState('');
    const [secondInvestmentName, setSecondInvestmentName] = useState('');

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
        if (selectedParameter.type === 'numeric') {
            setParamRangeMin(selectedParameter.min);
            setParamRangeMax(selectedParameter.max);
            setParamStep(selectedParameter.step);
            setParamValue(selectedParameter.min);
        } else if (selectedParameter.type === 'boolean') {
            // For boolean parameters, we only need two values: 0 and 1
            setParamRangeMin(0);
            setParamRangeMax(1);
            setParamStep(1);
            setParamValue(1); // Default to true/enabled
        }
    }, [selectedParameter]);

    const handleExploreParameter = async () => {
        if (!baseScenario) {
            setError("Please select a base scenario first");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Create a deep copy of the base scenario
            const modifiedScenario = deepCopy(baseScenario);

            // Special case handling for Roth Conversion Enabled
            if (selectedParameter.id === 'rothEnabled' && selectedParameter.specialCase) {
                // Get the current values
                const startYear = getNestedProperty(baseScenario, selectedParameter.startYearPath);
                const endYear = getNestedProperty(baseScenario, selectedParameter.endYearPath);

                console.log("Original Roth Conversion settings:");
                console.log("- Start Year:", startYear);
                console.log("- End Year:", endYear);

                if (paramValue === 0) {
                    // Disabling - Set both to null
                    setNestedProperty(modifiedScenario, selectedParameter.startYearPath, null);
                    setNestedProperty(modifiedScenario, selectedParameter.endYearPath, null);

                    console.log("Modified Roth Conversion settings (Disabled):");
                    console.log("- Start Year: null");
                    console.log("- End Year: null");

                    // Display a message
                    alert("Roth Conversion has been disabled. Start and end years set to null.");
                } else {
                    // Enabling - Set to the user-provided values
                    setNestedProperty(modifiedScenario, selectedParameter.startYearPath, rothStartYear);
                    setNestedProperty(modifiedScenario, selectedParameter.endYearPath, rothEndYear);

                    console.log("Modified Roth Conversion settings (Enabled):");
                    console.log("- Start Year:", rothStartYear);
                    console.log("- End Year:", rothEndYear);

                    // Display a message
                    alert(`Roth Conversion has been enabled with period: ${rothStartYear} - ${rothEndYear}`);
                }
            }
            // Special case for Event Series modification
            else if (selectedParameter.type === 'eventSeries') {
                if (!selectedEventSeries) {
                    setError("Please select an event series first");
                    return;
                }

                // Find the index of the selected event series in the scenario
                const eventSeriesIndex = baseScenario.eventSeries.findIndex(
                    series => series.name === selectedEventSeries.name
                );

                if (eventSeriesIndex === -1) {
                    setError("Selected event series not found in the scenario");
                    return;
                }

                // Get the original value
                const originalValue = baseScenario.eventSeries[eventSeriesIndex][selectedEventProperty];

                // Apply the modification
                modifiedScenario.eventSeries[eventSeriesIndex][selectedEventProperty] = eventSeriesNewValue;

                // If changing startYear and the type is not fixed, update type to fixed
                if (selectedEventProperty === 'startYear' && selectedEventSeries.startYearType !== 'fixed') {
                    modifiedScenario.eventSeries[eventSeriesIndex].startYearType = 'fixed';
                    console.log("Updated startYearType from", selectedEventSeries.startYearType, "to 'fixed'");
                }

                // If changing duration and the type is not fixed, update type to fixed
                if (selectedEventProperty === 'durationFixed' && selectedEventSeries.durationType !== 'fixed') {
                    modifiedScenario.eventSeries[eventSeriesIndex].durationType = 'fixed';
                    console.log("Updated durationType from", selectedEventSeries.durationType, "to 'fixed'");
                }

                // Log the change
                console.log(`Modified ${selectedEventSeries.name} (${selectedEventSeries.type}):`);
                console.log(`- Changed ${selectedEventProperty} from ${originalValue} to ${eventSeriesNewValue}`);

                // Display a message
                alert(`Modified event series: ${selectedEventSeries.name}
Property: ${selectedEventProperty}
Original value: ${originalValue}
New value: ${eventSeriesNewValue}`);
            }
            // Special case for Event Series Amount modification
            else if (selectedParameter.type === 'eventAmount') {
                if (!selectedAmountEventSeries) {
                    setError("Please select an income or expense event first");
                    return;
                }

                // Find the index of the selected event series in the scenario
                const eventSeriesIndex = baseScenario.eventSeries.findIndex(
                    series => series.name === selectedAmountEventSeries.name
                );

                if (eventSeriesIndex === -1) {
                    setError("Selected event series not found in the scenario");
                    return;
                }

                // Get the original value
                const originalAmount = baseScenario.eventSeries[eventSeriesIndex].initialAmount;

                // Apply the modification
                modifiedScenario.eventSeries[eventSeriesIndex].initialAmount = newInitialAmount;

                // Also update the current amount field if it exists
                if ('amount' in modifiedScenario.eventSeries[eventSeriesIndex]) {
                    modifiedScenario.eventSeries[eventSeriesIndex].amount = newInitialAmount;
                }

                // Log the change
                console.log(`Modified ${selectedAmountEventSeries.name} (${selectedAmountEventSeries.type}):`);
                console.log(`- Changed initialAmount from $${originalAmount} to $${newInitialAmount}`);

                // Display a message
                alert(`Modified event series amount: ${selectedAmountEventSeries.name}
Event type: ${selectedAmountEventSeries.type}
Original amount: $${originalAmount}
New amount: $${newInitialAmount}`);
            }
            // Special case for Asset Allocation modification
            else if (selectedParameter.type === 'assetAllocation') {
                if (!selectedAllocationEvent) {
                    setError("Please select an investment event series first");
                    return;
                }

                if (!firstInvestmentName || !secondInvestmentName) {
                    setError("Investment names not properly selected. Please try again or select a different investment.");
                    return;
                }

                // Find the index of the selected event series in the base scenario
                const eventSeriesIndex = baseScenario.eventSeries.findIndex(series =>
                    series.name === selectedAllocationEvent.name
                );

                if (eventSeriesIndex === -1) {
                    setError("Selected event series not found in the scenario");
                    return;
                }

                // Make a deep copy of the selected event series
                const updatedEventSeries = JSON.parse(JSON.stringify(baseScenario.eventSeries[eventSeriesIndex]));

                // Get the original percentages and calculate the new one for the second investment
                let originalFirstPercent, originalSecondPercent;
                const newFirstPercent = parseFloat(firstInvestmentPercent);

                try {
                    if (updatedEventSeries.allocations) {
                        // Regular allocations
                        if (!updatedEventSeries.allocations[firstInvestmentName] ||
                            !updatedEventSeries.allocations[secondInvestmentName]) {
                            setError("Could not find the selected investments in the allocations");
                            return;
                        }

                        originalFirstPercent = updatedEventSeries.allocations[firstInvestmentName];
                        originalSecondPercent = updatedEventSeries.allocations[secondInvestmentName];

                        // Update the allocations
                        updatedEventSeries.allocations[firstInvestmentName] = newFirstPercent;
                        updatedEventSeries.allocations[secondInvestmentName] = 100 - newFirstPercent;
                    } else if (updatedEventSeries.allocationType === 'glide') {
                        // For glide path, update both initial and final allocations independently

                        // First, update initialAllocations
                        if (updatedEventSeries.initialAllocations) {
                            if (!updatedEventSeries.initialAllocations[firstInvestmentName] ||
                                !updatedEventSeries.initialAllocations[secondInvestmentName]) {
                                setError("Could not find the selected investments in the initial allocations");
                                return;
                            }

                            // Store original values for reporting
                            originalFirstPercent = updatedEventSeries.initialAllocations[firstInvestmentName];
                            originalSecondPercent = updatedEventSeries.initialAllocations[secondInvestmentName];

                            // Update initial allocations
                            updatedEventSeries.initialAllocations[firstInvestmentName] = newFirstPercent;
                            updatedEventSeries.initialAllocations[secondInvestmentName] = 100 - newFirstPercent;
                        }

                        // Then update final allocations independently
                        let originalFinalFirstPercent = null;
                        let originalFinalSecondPercent = null;

                        if (updatedEventSeries.finalAllocations) {
                            if (!updatedEventSeries.finalAllocations[firstInvestmentName] ||
                                !updatedEventSeries.finalAllocations[secondInvestmentName]) {
                                setError("Could not find the selected investments in the final allocations");
                                return;
                            }

                            // Store original values for reporting
                            originalFinalFirstPercent = updatedEventSeries.finalAllocations[firstInvestmentName];
                            originalFinalSecondPercent = updatedEventSeries.finalAllocations[secondInvestmentName];

                            // Update final allocations with independently specified value
                            updatedEventSeries.finalAllocations[firstInvestmentName] = finalFirstInvestmentPercent;
                            updatedEventSeries.finalAllocations[secondInvestmentName] = 100 - finalFirstInvestmentPercent;
                        }
                    } else {
                        setError("Unsupported allocation type");
                        return;
                    }

                    // Apply the modifications
                    modifiedScenario.eventSeries[eventSeriesIndex] = updatedEventSeries;

                    // Log the changes
                    console.log(`Modified asset allocation for ${selectedAllocationEvent.name} (${selectedAllocationEvent.type}):`);

                    if (updatedEventSeries.allocations) {
                        console.log(`- Changed ${firstInvestmentName} from ${originalFirstPercent}% to ${newFirstPercent}%`);
                        console.log(`- Changed ${secondInvestmentName} from ${originalSecondPercent}% to ${100 - newFirstPercent}%`);

                        // Display a message
                        alert(`Modified asset allocation for ${selectedAllocationEvent.name}:
${firstInvestmentName}:
Original: ${originalFirstPercent}%
New: ${newFirstPercent}%

${secondInvestmentName}:
Original: ${originalSecondPercent}%
New: ${100 - newFirstPercent}%`);
                    } else if (updatedEventSeries.allocationType === 'glide') {
                        // For glide path, show both initial and final allocations
                        console.log(`Initial Allocations:`);
                        console.log(`- Changed ${firstInvestmentName} from ${originalFirstPercent}% to ${newFirstPercent}%`);
                        console.log(`- Changed ${secondInvestmentName} from ${originalSecondPercent}% to ${100 - newFirstPercent}%`);

                        if (updatedEventSeries.finalAllocations) {
                            const originalFinalFirstPercent = updatedEventSeries.finalAllocations[firstInvestmentName];
                            const originalFinalSecondPercent = updatedEventSeries.finalAllocations[secondInvestmentName];
                            console.log(`Final Allocations:`);
                            console.log(`- Changed ${firstInvestmentName} from ${originalFinalFirstPercent}% to ${finalFirstInvestmentPercent}%`);
                            console.log(`- Changed ${secondInvestmentName} from ${originalFinalSecondPercent}% to ${100 - finalFirstInvestmentPercent}%`);

                            // Display a message with both allocations
                            alert(`Modified glide path allocations for ${selectedAllocationEvent.name}:

Initial Allocations:
${firstInvestmentName}: ${originalFirstPercent}% → ${newFirstPercent}%
${secondInvestmentName}: ${originalSecondPercent}% → ${100 - newFirstPercent}%

Final Allocations:
${firstInvestmentName}: ${originalFinalFirstPercent}% → ${finalFirstInvestmentPercent}%
${secondInvestmentName}: ${originalFinalSecondPercent}% → ${100 - finalFirstInvestmentPercent}%

Note: Initial and final allocations are set independently.`);
                        }
                    }
                } catch (err) {
                    console.error('Error updating asset allocation:', err);
                    setError(err.message || 'An error occurred while updating the asset allocation');
                    return;
                }
            }
            else {
                // Handle normal parameters
                // Get the path segments from the selected parameter
                const pathSegments = selectedParameter.path.split('.');

                // Create path variations to try
                const pathVariations = [
                    selectedParameter.path,
                    selectedParameter.path.toLowerCase(),
                    selectedParameter.path.toUpperCase(),
                    selectedParameter.path.charAt(0).toLowerCase() + selectedParameter.path.slice(1),
                    selectedParameter.path.charAt(0).toUpperCase() + selectedParameter.path.slice(1)
                ];

                console.log("Selected parameter:", selectedParameter.name);
                console.log("Looking for path variations:", pathVariations);

                // Try to find the property using each variation
                let foundPath = null;
                let originalValue = undefined;

                for (const path of pathVariations) {
                    const value = getNestedProperty(baseScenario, path);
                    if (value !== undefined) {
                        foundPath = path;
                        originalValue = value;
                        break;
                    }
                }

                if (foundPath) {
                    console.log("Found property at path:", foundPath);
                    console.log("Original value:", originalValue);
                    console.log("New value would be:", paramValue);

                    // Apply the modification
                    setNestedProperty(modifiedScenario, foundPath, paramValue);
                    console.log("Successfully modified scenario");

                    // Display a message
                    alert(`Parameter modified! ${selectedParameter.name} set to ${paramValue}${selectedParameter.unit || ''}`);
                } else {
                    // If still not found, search for similar keys
                    console.log("Property not found. Searching for similar keys...");

                    // Flatten the object structure for easier searching
                    const allPaths = [];

                    function collectPaths(obj, currentPath = '') {
                        if (typeof obj !== 'object' || obj === null) return;

                        for (const key in obj) {
                            const newPath = currentPath ? `${currentPath}.${key}` : key;
                            allPaths.push(newPath);

                            if (typeof obj[key] === 'object' && obj[key] !== null) {
                                collectPaths(obj[key], newPath);
                            }
                        }
                    }

                    collectPaths(baseScenario);

                    // Search for paths containing the parameter name or related keywords
                    const keywords = [
                        pathSegments[pathSegments.length - 1].toLowerCase(),
                        selectedParameter.id.toLowerCase()
                    ];

                    const similarPaths = allPaths.filter(path =>
                        keywords.some(keyword => path.toLowerCase().includes(keyword))
                    );

                    console.log("Similar paths found:", similarPaths);
                    setError(`Could not find the property path. Check console for similar paths.`);
                }
            }

            // Send the data to the API
            const parameterInfo = {
                type: selectedParameter.type,
                name: selectedParameter.name,
                id: selectedParameter.id,
                value: paramValue
            };

            const result = await sendExplorationData(baseScenario, modifiedScenario, parameterInfo);
            setApiResponse(result);

        } catch (err) {
            console.error('Error exploring scenario:', err);
            setError(err.message || 'An error occurred while exploring the scenario');
        } finally {
            setLoading(false);
        }
    };

    // Render appropriate parameter input UI based on parameter type
    const renderParameterInputs = () => {
        if (selectedParameter.type === 'assetAllocation') {
            return (
                <AssetAllocationInput
                    baseScenario={baseScenario}
                    selectedAllocationEvent={selectedAllocationEvent}
                    setSelectedAllocationEvent={setSelectedAllocationEvent}
                    firstInvestmentName={firstInvestmentName}
                    setFirstInvestmentName={setFirstInvestmentName}
                    secondInvestmentName={secondInvestmentName}
                    setSecondInvestmentName={setSecondInvestmentName}
                    firstInvestmentPercent={firstInvestmentPercent}
                    setFirstInvestmentPercent={setFirstInvestmentPercent}
                    finalFirstInvestmentPercent={finalFirstInvestmentPercent}
                    setFinalFirstInvestmentPercent={setFinalFirstInvestmentPercent}
                    description={selectedParameter.description}
                />
            );
        }

        if (selectedParameter.type === 'eventAmount') {
            return (
                <EventAmountInput
                    baseScenario={baseScenario}
                    selectedAmountEventSeries={selectedAmountEventSeries}
                    setSelectedAmountEventSeries={setSelectedAmountEventSeries}
                    newInitialAmount={newInitialAmount}
                    setNewInitialAmount={setNewInitialAmount}
                    description={selectedParameter.description}
                />
            );
        }

        if (selectedParameter.type === 'eventSeries') {
            return (
                <EventSeriesInput
                    baseScenario={baseScenario}
                    selectedEventSeries={selectedEventSeries}
                    setSelectedEventSeries={setSelectedEventSeries}
                    selectedEventProperty={selectedEventProperty}
                    setSelectedEventProperty={setSelectedEventProperty}
                    eventSeriesNewValue={eventSeriesNewValue}
                    setEventSeriesNewValue={setEventSeriesNewValue}
                    description={selectedParameter.description}
                />
            );
        }

        if (selectedParameter.type === 'boolean') {
            if (selectedParameter.id === 'rothEnabled') {
                return (
                    <RothConversionInput
                        paramValue={paramValue}
                        setParamValue={setParamValue}
                        rothStartYear={rothStartYear}
                        setRothStartYear={setRothStartYear}
                        rothEndYear={rothEndYear}
                        setRothEndYear={setRothEndYear}
                    />
                );
            }
        }

        // Default to generic input for other parameter types
        return (
            <GenericInput
                selectedParameter={selectedParameter}
                paramValue={paramValue}
                setParamValue={setParamValue}
                paramRangeMin={paramRangeMin}
                paramRangeMax={paramRangeMax}
                paramStep={paramStep}
            />
        );
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 space-y-8"
        >
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-black">Parameter Exploration</h1>
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
                                onClick={() => {
                                    setBaseScenario(scenario);
                                    // Print the structure of the selected scenario
                                    console.log("Selected Scenario:", scenario.name);
                                    console.log("Top-level keys:", Object.keys(scenario));
                                    const structure = printObjectStructure(scenario);
                                    console.log("Scenario structure:", structure);
                                }}
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
                <h2 className="text-xl font-semibold mb-4">2. Configure Parameter Modification</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parameter to Modify
                        </label>
                        <select
                            value={selectedParameter.id}
                            onChange={(e) => {
                                const param = PARAMETER_TYPES.find(p => p.id === e.target.value);
                                setSelectedParameter(param);
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

                    {renderParameterInputs()}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleExploreParameter}
                        disabled={!baseScenario || loading}
                        className={`px-6 py-2 rounded-md flex items-center ${baseScenario && !loading
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'} 
                            disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
                    >
                        {loading && (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {loading ? 'Processing...' : 'Explore Parameter'}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            <ErrorDisplay
                error={error}
                onDismiss={() => setError(null)}
            />

            {/* API Result Display */}
            <ApiResultDisplay
                apiResponse={apiResponse}
                onClear={() => setApiResponse(null)}
            />
        </motion.div>
    );
};

export default ParameterExplorationPage 