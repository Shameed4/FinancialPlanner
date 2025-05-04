'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import pageVariants from '../components/PageAnimation'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Define the parameter types that can be modified
const PARAMETER_TYPES = [
    {
        id: 'rothEnabled',
        name: 'Roth Conversion Enabled',
        type: 'boolean',
        valueLabels: { 0: 'Disabled', 1: 'Enabled' },
        specialCase: true,
        startYearPath: 'rothOptimizationStartYear',
        endYearPath: 'rothOptimizationEndYear'
    },
    {
        id: 'eventSeriesModification',
        name: 'Event Series Timing',
        type: 'eventSeries',
        description: 'Modify start year or duration of an event series'
    },
    {
        id: 'eventSeriesAmount',
        name: 'Event Series Amount',
        type: 'eventAmount',
        description: 'Modify the initial amount of an income or expense event series'
    },
    {
        id: 'assetAllocation',
        name: 'Asset Allocation',
        type: 'assetAllocation',
        description: 'Modify the asset allocation percentages for investment events (only for "invest" events with exactly 2 investments)'
    },
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

// Add a function to print the structure of an object
function printObjectStructure(obj, prefix = '', maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return;

    const output = {};

    for (const key in obj) {
        const value = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                output[key] = `Array(${value.length})`;
                // If array contains objects, print the structure of the first item
                if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                    output[`${key}[0]`] = printObjectStructure(value[0], `${path}[0]`, maxDepth, currentDepth + 1);
                }
            } else {
                output[key] = printObjectStructure(value, path, maxDepth, currentDepth + 1);
            }
        } else {
            output[key] = typeof value === 'function' ? 'function()' : value;
        }
    }

    return output;
}

// Helper function to get a nested object property by path
function getNestedProperty(obj, path) {
    if (!path) return undefined;

    const pathArray = path.split('.');
    let current = obj;

    for (let i = 0; i < pathArray.length; i++) {
        const key = pathArray[i];

        // Handle array indices
        if (!isNaN(key)) {
            const index = parseInt(key);
            if (!current[index]) return undefined;
            current = current[index];
        } else {
            if (current[key] === undefined) return undefined;
            current = current[key];
        }
    }

    return current;
}

// Helper function to set a nested object property by path
function setNestedProperty(obj, path, value) {
    if (!path) return obj;

    const pathArray = path.split('.');
    let current = obj;

    for (let i = 0; i < pathArray.length - 1; i++) {
        const key = pathArray[i];

        // Handle array indices
        if (!isNaN(key)) {
            const index = parseInt(key);
            if (!current[index]) return obj; // Path doesn't exist
            current = current[index];
        } else {
            if (!current[key]) return obj; // Path doesn't exist
            current = current[key];
        }
    }

    const lastKey = pathArray[pathArray.length - 1];

    // Handle array indices for the last key
    if (!isNaN(lastKey)) {
        const index = parseInt(lastKey);
        if (current[index] !== undefined) {
            current[index] = value;
        }
    } else {
        if (current[lastKey] !== undefined) {
            current[lastKey] = value;
        }
    }

    return obj;
}

// Helper function to create a deep copy of an object
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

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

            // Send the baseline and modified scenarios to the API
            console.log("Sending scenarios to API...");

            // Prepare the payload
            const payload = {
                baselineScenario: baseScenario,
                modifiedScenario: modifiedScenario,
                parameterInfo: {
                    type: selectedParameter.type,
                    name: selectedParameter.name,
                    id: selectedParameter.id,
                    value: paramValue
                }
            };

            // Make the API call
            const response = await fetch('/api/explore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();
            console.log("API Response:", result);
            setApiResponse(result);

        } catch (err) {
            console.error('Error exploring scenario:', err);
            setError(err.message || 'An error occurred while exploring the scenario');
        } finally {
            setLoading(false);
        }
    };

    // Format parameter value for display (e.g., handle boolean values)
    const formatParamValue = (value) => {
        if (selectedParameter.valueLabels && selectedParameter.valueLabels[value] !== undefined) {
            return selectedParameter.valueLabels[value];
        }
        return selectedParameter.unit ? `${value}${selectedParameter.unit}` : value;
    };

    // For boolean parameters, don't show range inputs
    const renderParameterInputs = () => {
        // Special case for asset allocation modification
        if (selectedParameter.type === 'assetAllocation') {
            // Filter event series to find those of type "invest" with exactly 2 allocations
            const eventSeries = baseScenario?.eventSeries?.filter(series => {
                if (series.type !== 'invest') return false;

                // For regular allocations
                if (series.allocations) {
                    const allocationKeys = Object.keys(series.allocations || {});
                    return allocationKeys.length === 2;
                }

                // For glide path allocations
                if (series.allocationType === 'glide' && series.initialAllocations && series.finalAllocations) {
                    const initialKeys = Object.keys(series.initialAllocations);
                    const finalKeys = Object.keys(series.finalAllocations);

                    // Check if both have exactly 2 entries and they match
                    return initialKeys.length === 2 && finalKeys.length === 2 &&
                        initialKeys.every(key => finalKeys.includes(key));
                }

                return false;
            }) || [];

            return (
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 mb-4">
                        {selectedParameter.description}
                    </p>

                    {eventSeries.length === 0 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-yellow-700">
                                No eligible investment events found. This feature requires event series of type "invest" or "rebalance" with exactly 2 investments in their allocations.
                            </p>
                        </div>
                    )}

                    {eventSeries.length > 0 && (
                        <>
                            {/* Event Series Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Investment Event
                                </label>
                                <select
                                    value={selectedAllocationEvent?.name || ''}
                                    onChange={(e) => {
                                        const selected = eventSeries.find(series => series.name === e.target.value);
                                        setSelectedAllocationEvent(selected);

                                        if (selected) {
                                            // Get the two investment names and percentages
                                            if (selected.allocations) {
                                                // Regular allocations
                                                const investmentNames = Object.keys(selected.allocations);
                                                if (investmentNames.length >= 2) {
                                                    setFirstInvestmentName(investmentNames[0]);
                                                    setSecondInvestmentName(investmentNames[1]);
                                                    setFirstInvestmentPercent(selected.allocations[investmentNames[0]]);
                                                }
                                            } else if (selected.allocationType === 'glide' && selected.initialAllocations) {
                                                // Glide path allocations - use initialAllocations
                                                const investmentNames = Object.keys(selected.initialAllocations);
                                                if (investmentNames.length >= 2) {
                                                    setFirstInvestmentName(investmentNames[0]);
                                                    setSecondInvestmentName(investmentNames[1]);

                                                    // Set initial allocation
                                                    setFirstInvestmentPercent(selected.initialAllocations[investmentNames[0]]);

                                                    // Set final allocation if available
                                                    if (selected.finalAllocations && selected.finalAllocations[investmentNames[0]] !== undefined) {
                                                        setFinalFirstInvestmentPercent(selected.finalAllocations[investmentNames[0]]);
                                                    } else {
                                                        setFinalFirstInvestmentPercent(50); // Default value if not found
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="" disabled>Select an investment event</option>
                                    {eventSeries.map((series) => (
                                        <option key={series.name} value={series.name}>
                                            {series.name} ({series.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Allocation Percentage Input */}
                            {selectedAllocationEvent && (
                                <div>
                                    <h3 className="text-md font-medium mb-3">Asset Allocation</h3>

                                    {selectedAllocationEvent.allocationType === 'glide' && selectedAllocationEvent.initialAllocations && selectedAllocationEvent.finalAllocations ? (
                                        <>
                                            {/* Glide Path Allocations (separate inputs for initial and final) */}
                                            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                                                <h4 className="font-medium text-gray-800 mb-2">Initial Allocations</h4>
                                                <div className="mb-3">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {firstInvestmentName} (%)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={firstInvestmentPercent}
                                                        onChange={(e) => {
                                                            const value = Math.min(100, Math.max(0, Number(e.target.value)));
                                                            setFirstInvestmentPercent(value);
                                                        }}
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {secondInvestmentName} (%)
                                                    </label>
                                                    <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                                                        {100 - firstInvestmentPercent}% (automatically calculated)
                                                    </div>
                                                </div>

                                                {/* Initial Allocation Visualization */}
                                                <div className="mt-3">
                                                    <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden flex">
                                                        <div
                                                            className="h-full bg-blue-500"
                                                            style={{ width: `${firstInvestmentPercent}%` }}
                                                            title={`${firstInvestmentName}: ${firstInvestmentPercent}%`}
                                                        ></div>
                                                        <div
                                                            className="h-full bg-green-500"
                                                            style={{ width: `${100 - firstInvestmentPercent}%` }}
                                                            title={`${secondInvestmentName}: ${100 - firstInvestmentPercent}%`}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Final Allocations Section */}
                                            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                                                <h4 className="font-medium text-gray-800 mb-2">Final Allocations</h4>

                                                {/* Add state for final allocations */}
                                                <div className="mb-3">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {firstInvestmentName} (%)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={finalFirstInvestmentPercent}
                                                        onChange={(e) => {
                                                            const value = Math.min(100, Math.max(0, Number(e.target.value)));
                                                            setFinalFirstInvestmentPercent(value);
                                                        }}
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {secondInvestmentName} (%)
                                                    </label>
                                                    <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                                                        {100 - finalFirstInvestmentPercent}% (automatically calculated)
                                                    </div>
                                                </div>

                                                {/* Final Allocation Visualization */}
                                                <div className="mt-3">
                                                    <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden flex">
                                                        <div
                                                            className="h-full bg-indigo-500"
                                                            style={{ width: `${finalFirstInvestmentPercent}%` }}
                                                            title={`${firstInvestmentName}: ${finalFirstInvestmentPercent}%`}
                                                        ></div>
                                                        <div
                                                            className="h-full bg-purple-500"
                                                            style={{ width: `${100 - finalFirstInvestmentPercent}%` }}
                                                            title={`${secondInvestmentName}: ${100 - finalFirstInvestmentPercent}%`}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        // Regular allocations - single input
                                        <>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    {firstInvestmentName} (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={firstInvestmentPercent}
                                                    onChange={(e) => {
                                                        const value = Math.min(100, Math.max(0, Number(e.target.value)));
                                                        setFirstInvestmentPercent(value);
                                                    }}
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    {secondInvestmentName} (%)
                                                </label>
                                                <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                                                    {100 - firstInvestmentPercent}% (automatically calculated)
                                                </div>
                                            </div>

                                            {/* Visualization */}
                                            <div className="mt-4">
                                                <h4 className="text-sm font-medium mb-2">Current Allocation Visualization</h4>
                                                <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="h-full bg-blue-500"
                                                        style={{ width: `${firstInvestmentPercent}%` }}
                                                        title={`${firstInvestmentName}: ${firstInvestmentPercent}%`}
                                                    ></div>
                                                    <div
                                                        className="h-full bg-green-500"
                                                        style={{ width: `${100 - firstInvestmentPercent}%` }}
                                                        title={`${secondInvestmentName}: ${100 - firstInvestmentPercent}%`}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between mt-1 text-xs">
                                                    <div className="flex items-center">
                                                        <div className="w-3 h-3 bg-blue-500 mr-1 rounded-sm"></div>
                                                        <span className="text-gray-700">{firstInvestmentName}: {firstInvestmentPercent}%</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <div className="w-3 h-3 bg-green-500 mr-1 rounded-sm"></div>
                                                        <span className="text-gray-700">{secondInvestmentName}: {100 - firstInvestmentPercent}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            );
        }

        // Special case for event series amount modification
        if (selectedParameter.type === 'eventAmount') {
            // Get all income and expense event series from the base scenario
            const eventSeries = baseScenario?.eventSeries?.filter(
                series => series.type === 'income' || series.type === 'expense'
            ) || [];

            return (
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 mb-4">
                        {selectedParameter.description}
                    </p>

                    {/* Event Series Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Income or Expense Event
                        </label>
                        <select
                            value={selectedAmountEventSeries?.name || ''}
                            onChange={(e) => {
                                const selected = eventSeries.find(series => series.name === e.target.value);
                                setSelectedAmountEventSeries(selected);

                                // Set default amount from the selected series
                                if (selected) {
                                    setNewInitialAmount(selected.initialAmount || 0);
                                }
                            }}
                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="" disabled>Select an event</option>
                            {eventSeries.map((series) => (
                                <option key={series.name} value={series.name}>
                                    {series.name} ({series.type}) - Current: ${series.initialAmount}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Initial Amount Input */}
                    {selectedAmountEventSeries && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Initial Amount ($)
                            </label>
                            <input
                                type="number"
                                value={newInitialAmount}
                                onChange={(e) => setNewInitialAmount(Number(e.target.value))}
                                min={0}
                                step={100}
                                className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            {/* Show current value and other details */}
                            <div className="mt-2 space-y-1 text-sm">
                                <div className="text-gray-600">
                                    Current initial amount: ${selectedAmountEventSeries.initialAmount || 0}
                                </div>

                                <div className="text-gray-600">
                                    Change type: {selectedAmountEventSeries.changeType || 'Not set'}
                                </div>

                                <div className="text-gray-600">
                                    Change amount or percent: {selectedAmountEventSeries.changeAmtOrPct || 'Not set'}
                                </div>

                                <div className="text-gray-600">
                                    Inflation adjusted: {selectedAmountEventSeries.inflationAdjusted ? 'Yes' : 'No'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Special case for event series modification
        if (selectedParameter.type === 'eventSeries') {
            // Get all event series from the base scenario
            const eventSeries = baseScenario?.eventSeries || [];

            return (
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 mb-4">
                        {selectedParameter.description}
                    </p>

                    {/* Event Series Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Event Series
                        </label>
                        <select
                            value={selectedEventSeries?.name || ''}
                            onChange={(e) => {
                                const selected = eventSeries.find(series => series.name === e.target.value);
                                setSelectedEventSeries(selected);

                                // Set default value based on the property
                                if (selectedEventProperty === 'startYear') {
                                    setEventSeriesNewValue(selected?.startYear || 2025);
                                } else if (selectedEventProperty === 'durationFixed') {
                                    setEventSeriesNewValue(selected?.durationFixed || 10);
                                }
                            }}
                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="" disabled>Select an event series</option>
                            {eventSeries.map((series) => (
                                <option key={series.name} value={series.name}>
                                    {series.name} ({series.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Property Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Property to Modify
                        </label>
                        <select
                            value={selectedEventProperty}
                            onChange={(e) => {
                                setSelectedEventProperty(e.target.value);

                                // Update default value based on the selected property
                                if (e.target.value === 'startYear' && selectedEventSeries) {
                                    setEventSeriesNewValue(selectedEventSeries.startYear || 2025);
                                } else if (e.target.value === 'durationFixed' && selectedEventSeries) {
                                    setEventSeriesNewValue(selectedEventSeries.durationFixed || 10);
                                }
                            }}
                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="startYear">Start Year</option>
                            <option value="durationFixed">Duration</option>
                        </select>
                    </div>

                    {/* Value Input */}
                    {selectedEventSeries && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Value for {selectedEventProperty === 'startYear' ? 'Start Year' : 'Duration'}
                            </label>
                            <input
                                type="number"
                                value={eventSeriesNewValue}
                                onChange={(e) => setEventSeriesNewValue(Number(e.target.value))}
                                min={selectedEventProperty === 'startYear' ? 2020 : 1}
                                max={selectedEventProperty === 'startYear' ? 2100 : 200}
                                className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            {/* Show current value */}
                            <div className="mt-2 text-sm text-gray-600">
                                Current value: {selectedEventSeries[selectedEventProperty] || 'Not set'}
                                {selectedEventProperty === 'startYear' && selectedEventSeries.startYearType !== 'fixed' && (
                                    <span className="ml-2 text-orange-600">
                                        (Note: This event uses {selectedEventSeries.startYearType} start year type)
                                    </span>
                                )}
                                {selectedEventProperty === 'durationFixed' && selectedEventSeries.durationType !== 'fixed' && (
                                    <span className="ml-2 text-orange-600">
                                        (Note: This event uses {selectedEventSeries.durationType} duration type)
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (selectedParameter.type === 'boolean') {
            // Special case for Roth Conversion
            if (selectedParameter.id === 'rothEnabled') {
                return (
                    <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 mb-4">
                            Enable or disable Roth Conversion:
                        </p>
                        <div className="flex space-x-4 mb-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="booleanValue"
                                    value={0}
                                    checked={paramValue === 0}
                                    onChange={() => setParamValue(0)}
                                    className="h-4 w-4 text-blue-600"
                                />
                                <span>Disabled</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="booleanValue"
                                    value={1}
                                    checked={paramValue === 1}
                                    onChange={() => setParamValue(1)}
                                    className="h-4 w-4 text-blue-600"
                                />
                                <span>Enabled</span>
                            </label>
                        </div>

                        {/* Show year inputs only when Enabled is selected */}
                        {paramValue === 1 && (
                            <div className="mt-4 space-y-4 p-4 bg-white rounded border">
                                <h3 className="text-sm font-medium text-gray-700">Roth Conversion Period</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Start Year
                                        </label>
                                        <input
                                            type="number"
                                            value={rothStartYear}
                                            onChange={(e) => setRothStartYear(Number(e.target.value))}
                                            min={2020}
                                            max={rothEndYear - 1}
                                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            End Year
                                        </label>
                                        <input
                                            type="number"
                                            value={rothEndYear}
                                            onChange={(e) => setRothEndYear(Number(e.target.value))}
                                            min={rothStartYear + 1}
                                            max={2100}
                                            className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    The Roth Conversion will be performed during this period.
                                </p>
                            </div>
                        )}
                    </div>
                );
            }

            // Default boolean parameter UI
            return (
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 mb-4">
                        This is a boolean parameter with two possible values:
                    </p>
                    <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="booleanValue"
                                value={0}
                                checked={paramValue === 0}
                                onChange={() => setParamValue(0)}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>Disabled</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="booleanValue"
                                value={1}
                                checked={paramValue === 1}
                                onChange={() => setParamValue(1)}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>Enabled</span>
                        </label>
                    </div>
                </div>
            );
        }

        return (
            <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parameter Value
                </label>
                <input
                    type="number"
                    value={paramValue}
                    onChange={(e) => setParamValue(Number(e.target.value))}
                    min={paramRangeMin}
                    max={paramRangeMax}
                    step={paramStep}
                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>Min: {paramRangeMin}{selectedParameter.unit}</span>
                    <span>Max: {paramRangeMax}{selectedParameter.unit}</span>
                    <span>Step: {paramStep}{selectedParameter.unit}</span>
                </div>
            </div>
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

            {error && (
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="text-red-600 mb-4">Error: {error}</div>
                    <button
                        onClick={() => setError(null)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {apiResponse && (
                <div className="bg-white rounded-xl shadow p-6 mt-6">
                    <h2 className="text-xl font-semibold mb-4">Exploration Results</h2>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap text-gray-700">
                            {JSON.stringify(apiResponse, null, 2)}
                        </pre>
                    </div>
                    <button
                        onClick={() => setApiResponse(null)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Clear Results
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default ParameterExplorationPage 