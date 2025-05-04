'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import pageVariants from "../components/PageAnimation";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

// Helper function to format currency values
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

const ExplorationPage = () => {
    const router = useRouter();
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [scenarios, setScenarios] = useState([]);
    const [parameter, setParameter] = useState('rothConversion');
    const [parameterRange, setParameterRange] = useState({ min: 0, max: 1, step: 1 });

    // Event series specific state
    const [selectedEventSeries, setSelectedEventSeries] = useState(null);
    const [eventSeriesModifyAttribute, setEventSeriesModifyAttribute] = useState('startYear'); // 'startYear' or 'duration'
    const [eventSeriesLowerBound, setEventSeriesLowerBound] = useState(0);
    const [eventSeriesUpperBound, setEventSeriesUpperBound] = useState(0);
    const [eventSeriesSteps, setEventSeriesSteps] = useState(5);

    // Allocation specific state
    const [selectedInvestEvent, setSelectedInvestEvent] = useState(null);
    const [investmentPair, setInvestmentPair] = useState(null); // {first: {name, percentage}, second: {name, percentage}}
    const [allocationLowerBound, setAllocationLowerBound] = useState(0);
    const [allocationUpperBound, setAllocationUpperBound] = useState(100);
    const [allocationSteps, setAllocationSteps] = useState(10);
    // Number of simulations to run
    const [simulationCount, setSimulationCount] = useState(100);
    // Second investment's bounds are calculated as complementary values
    const secondAllocationLowerBound = allocationLowerBound !== null ? 100 - allocationLowerBound : null;
    const secondAllocationUpperBound = allocationUpperBound !== null ? 100 - allocationUpperBound : null;

    const { data: session } = useSession();

    // Add state for feedback messages
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Add a state variable to track the index of the selected event series
    const [selectedEventSeriesIndex, setSelectedEventSeriesIndex] = useState(-1);

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
        { id: 'rothConversion', name: 'Roth Conversion Enabled', min: 0, max: 1, step: 1 },
        { id: 'eventSeriesTiming', name: 'Event Series Timing', min: 2023, max: 2050, step: 1 },
        { id: 'eventSeriesAmount', name: 'Event Series Amount', min: 0, max: 500000, step: 5000 },
        { id: 'allocations', name: 'Allocations', min: 0, max: 100, step: 5 },
    ];

    // Update parameter range when parameter changes
    useEffect(() => {
        const selectedParam = explorationParameters.find(p => p.id === parameter);
        if (selectedParam) {
            setParameterRange({
                min: selectedParam.min,
                max: selectedParam.max,
                step: selectedParam.step
            });
        }

        // Special handling for rothConversion parameter
        if (parameter === 'rothConversion' && selectedScenario) {
            // Check if Roth optimization is enabled in the selected scenario
            const hasRothProperties = 'rothOptimizationStartYear' in selectedScenario &&
                'rothOptimizationEndYear' in selectedScenario;

            const isRothEnabled = hasRothProperties &&
                selectedScenario.rothOptimizationStartYear !== null &&
                selectedScenario.rothOptimizationEndYear !== null;

            console.log('Parameter changed to Roth Conversion');
            console.log('Is Roth enabled in scenario:', isRothEnabled);

            // Set the toggle state based on the scenario's Roth settings
            setParameterRange({
                min: isRothEnabled ? 1 : 0,
                max: isRothEnabled ? 1 : 0,
                step: 1
            });
        }

        // Reset event series selection when changing parameters
        if (parameter === 'eventSeriesTiming' && selectedScenario) {
            // Default to first event series if available
            if (selectedScenario.eventSeries && selectedScenario.eventSeries.length > 0) {
                const firstEventSeries = selectedScenario.eventSeries[0];
                setSelectedEventSeries(firstEventSeries);

                // Store the index of the event series for reliable reference
                setSelectedEventSeriesIndex(0);

                // Set default modify attribute to startYear
                setEventSeriesModifyAttribute('startYear');

                // Set initial bounds based on the selected event series
                const currentStartYear = firstEventSeries.startYear || new Date().getFullYear();
                setEventSeriesLowerBound(currentStartYear);
                setEventSeriesUpperBound(currentStartYear + 10);
            } else {
                setSelectedEventSeries(null);
                setSelectedEventSeriesIndex(-1);
            }
        }

        // Initialize for Event Series Amount parameter
        if (parameter === 'eventSeriesAmount' && selectedScenario) {
            // Find first income or expense event series
            const incomeOrExpenseSeries = selectedScenario.eventSeries?.find(
                es => es.type === 'income' || es.type === 'expense'
            );

            if (incomeOrExpenseSeries) {
                setSelectedEventSeries(incomeOrExpenseSeries);

                // Set bounds based on the current amount
                const currentAmount = incomeOrExpenseSeries.initialAmount || 0;
                setEventSeriesLowerBound(currentAmount);
                setEventSeriesUpperBound(currentAmount * 2); // Double as upper bound
                setEventSeriesSteps(Math.round(currentAmount / 5)); // Default step size to 1/5 of amount
            } else {
                setSelectedEventSeries(null);
            }
        }

        // Initialize for Allocations parameter
        if (parameter === 'allocations' && selectedScenario) {
            // Find invest type events
            const investEvents = selectedScenario.eventSeries?.filter(es => es.type === 'invest');

            if (investEvents && investEvents.length > 0) {
                const firstInvestEvent = investEvents[0];
                setSelectedInvestEvent(firstInvestEvent);

                // Check if the event has a valid initialAllocations
                if (firstInvestEvent.initialAllocations && Object.keys(firstInvestEvent.initialAllocations).length === 2) {
                    // Initialize the investment pair
                    const initialAllocations = firstInvestEvent.initialAllocations;
                    const investmentNames = Object.keys(initialAllocations);
                    const firstInvestment = {
                        name: investmentNames[0],
                        percentage: initialAllocations[investmentNames[0]]
                    };
                    const secondInvestment = {
                        name: investmentNames[1],
                        percentage: initialAllocations[investmentNames[1]]
                    };
                    setInvestmentPair({ first: firstInvestment, second: secondInvestment });

                    // Set bounds for allocation based on current values
                    // Ensure we provide a reasonable range around the current allocation
                    const currentPercentage = firstInvestment.percentage;
                    const range = 30; // Range of +/- 30% around current value
                    setAllocationLowerBound(Math.max(0, currentPercentage - range));
                    setAllocationUpperBound(Math.min(100, currentPercentage + range));
                    setAllocationSteps(10);
                } else {
                    // Clear investment pair
                    setInvestmentPair(null);

                    // Set default bounds
                    setAllocationLowerBound(0);
                    setAllocationUpperBound(100);
                    setAllocationSteps(10);
                }
            } else {
                setSelectedInvestEvent(null);
                setInvestmentPair(null);
            }
        }
    }, [parameter, selectedScenario]);

    // Update bounds when selecting a different event series or changing the attribute to modify
    useEffect(() => {
        if (selectedEventSeries && parameter === 'eventSeriesTiming') {
            if (eventSeriesModifyAttribute === 'startYear') {
                // Get current start year from the selected event series
                const currentStartYear = selectedEventSeries.startYear || new Date().getFullYear();
                setEventSeriesLowerBound(currentStartYear);
                setEventSeriesUpperBound(currentStartYear + 10);
            } else if (eventSeriesModifyAttribute === 'duration') {
                // Get current duration from the selected event series
                const currentDuration = selectedEventSeries.durationFixed || 10;
                setEventSeriesLowerBound(currentDuration);
                setEventSeriesUpperBound(currentDuration + 10);
            }
        }
    }, [selectedEventSeries, eventSeriesModifyAttribute, parameter]);

    // Update investment pair when event changes
    useEffect(() => {
        if (selectedInvestEvent && parameter === 'allocations') {
            const initialAllocations = selectedInvestEvent.initialAllocations;

            if (initialAllocations && Object.keys(initialAllocations).length === 2) {
                const investmentNames = Object.keys(initialAllocations);
                const firstInvestment = {
                    name: investmentNames[0],
                    percentage: initialAllocations[investmentNames[0]]
                };
                const secondInvestment = {
                    name: investmentNames[1],
                    percentage: initialAllocations[investmentNames[1]]
                };

                setInvestmentPair({ first: firstInvestment, second: secondInvestment });

                // Set bounds based on current allocation
                setAllocationLowerBound(0);
                setAllocationUpperBound(100);
                setAllocationSteps(10);
            } else {
                setInvestmentPair(null);
            }
        }
    }, [selectedInvestEvent, parameter]);

    // Update selected scenario and check Roth optimization settings
    const handleScenarioSelect = (scenario) => {
        setSelectedScenario(scenario);

        // Check if Roth optimization properties exist and are not null
        const hasRothProperties = 'rothOptimizationStartYear' in scenario &&
            'rothOptimizationEndYear' in scenario;

        const isRothEnabled = hasRothProperties &&
            scenario.rothOptimizationStartYear !== null &&
            scenario.rothOptimizationEndYear !== null;

        console.log('Scenario selected:', scenario.name);
        console.log('Has Roth properties:', hasRothProperties);
        console.log('Is Roth enabled:', isRothEnabled);

        // Update the parameter range if the current parameter is rothConversion
        if (parameter === 'rothConversion') {
            console.log('Setting Roth toggle to:', isRothEnabled ? 'enabled' : 'disabled');
            setParameterRange({
                min: isRothEnabled ? 1 : 0,
                max: isRothEnabled ? 1 : 0,
                step: 1
            });
        }

        // Initialize event series selection if that's the current parameter
        if (parameter === 'eventSeriesTiming' && scenario.eventSeries && scenario.eventSeries.length > 0) {
            setSelectedEventSeries(scenario.eventSeries[0]);
        }
    };

    const handleExploreClick = () => {
        // Clear any previous feedback
        setFeedbackMessage('');

        if (parameter === 'amount') {
            if (!selectedEvent) {
                setFeedbackMessage('Please select an event to explore');
                return;
            }

            // Basic implementation for amount parameter
            handleGenericExploration('amount', selectedEvent.title);
        } else if (parameter === 'date') {
            if (!selectedEvent) {
                setFeedbackMessage('Please select an event to explore');
                return;
            }

            // Basic implementation for date parameter
            handleGenericExploration('date', selectedEvent.title);
        } else if (parameter === 'recurringAmount') {
            if (!selectedEvent) {
                setFeedbackMessage('Please select an event to explore');
                return;
            }

            // Basic implementation for recurringAmount parameter
            handleGenericExploration('recurringAmount', selectedEvent.title);
        } else if (parameter === 'eventSeriesTiming') {
            if (!selectedEventSeries) {
                setFeedbackMessage('Please select an event series to explore');
                return;
            }

            // Basic implementation for eventSeriesTiming parameter
            const data = {
                parameter: 'eventSeriesTiming',
                selectedScenario: selectedScenario,
                modifyAttribute: eventSeriesModifyAttribute,
                lowerBound: eventSeriesLowerBound,
                upperBound: eventSeriesUpperBound,
                steps: eventSeriesSteps,
                selectedEventSeries: selectedEventSeries,
                selectedEventSeriesIndex: selectedEventSeriesIndex
            };

            sendExplorationRequest(data);
        } else if (parameter === 'eventSeriesAmount') {
            if (!selectedEventSeries) {
                setFeedbackMessage('Please select an event series to explore');
                return;
            }

            // Basic implementation for eventSeriesAmount parameter
            const data = {
                parameter: 'eventSeriesAmount',
                selectedScenario: selectedScenario,
                lowerBound: eventSeriesLowerBound,
                upperBound: eventSeriesUpperBound,
                steps: eventSeriesSteps,
                selectedEventSeries: selectedEventSeries,
                selectedEventSeriesIndex: selectedEventSeriesIndex
            };

            sendExplorationRequest(data);
        } else if (parameter === 'rothConversion') {
            // Implementation for Roth conversion parameter
            const data = {
                parameter: 'rothConversion',
                selectedScenario: selectedScenario,
                toggleValue: parameterRange.min === 0 ? false : true
            };

            sendExplorationRequest(data);
        } else if (parameter === 'allocations') {
            if (!selectedInvestEvent) {
                setFeedbackMessage('Please select an investment event to explore');
                return;
            }

            if (!investmentPair) {
                setFeedbackMessage('The selected investment event does not have a valid allocation (needs exactly two investments in initialAllocations). Please select a different event.');
                return;
            }

            // Validate bounds for allocations
            if (allocationLowerBound >= allocationUpperBound) {
                setFeedbackMessage(`The minimum allocation for ${investmentPair.first.name} must be less than the maximum allocation.`);
                return;
            }

            if (allocationLowerBound < 0 || allocationLowerBound > 100) {
                setFeedbackMessage(`The minimum allocation for ${investmentPair.first.name} must be between 0 and 100.`);
                return;
            }

            if (allocationUpperBound < 0 || allocationUpperBound > 100) {
                setFeedbackMessage(`The maximum allocation for ${investmentPair.first.name} must be between 0 and 100.`);
                return;
            }

            if (allocationSteps <= 0) {
                setFeedbackMessage('The step size must be greater than 0.');
                return;
            }

            // Generate scenarios with different allocation percentages
            const scenarios = [];
            const stepValues = [];

            // Calculate step size and generate values
            const stepSize = allocationSteps;
            for (let value = allocationLowerBound; value <= allocationUpperBound; value += stepSize) {
                stepValues.push(Math.round(value)); // Round to avoid floating point issues
            }

            // Make sure upper bound is included
            if (stepValues[stepValues.length - 1] !== allocationUpperBound) {
                stepValues.push(allocationUpperBound);
            }

            // Create scenarios for each step value
            stepValues.forEach(firstPercentage => {
                // Get complementary percentage
                const secondPercentage = 100 - firstPercentage;

                // Create a deep copy of the scenario
                const modifiedScenario = JSON.parse(JSON.stringify(selectedScenario));

                // Find the selected event in the copy
                const eventIndex = modifiedScenario.eventSeries.findIndex(
                    es => es === selectedInvestEvent || es.title === selectedInvestEvent.title
                );

                if (eventIndex === -1) {
                    console.error(`Event "${selectedInvestEvent.title}" not found in scenario.`);
                    return;
                }

                const event = modifiedScenario.eventSeries[eventIndex];

                // Make sure initialAllocations exists
                if (!event.initialAllocations) {
                    event.initialAllocations = {};
                }

                // Update the percentages
                event.initialAllocations[investmentPair.first.name] = firstPercentage;
                event.initialAllocations[investmentPair.second.name] = secondPercentage;

                // Add step info to scenario name for identification
                modifiedScenario.name = `${selectedScenario.name} (${investmentPair.first.name}: ${firstPercentage}%, ${investmentPair.second.name}: ${secondPercentage}%)`;

                // Add this scenario to our array
                scenarios.push(modifiedScenario);
            });

            // Display information about the generated scenarios
            const allocationPairs = stepValues.map((firstPercentage, index) => {
                const secondPercentage = 100 - firstPercentage;
                return `Scenario ${index + 1}: ${investmentPair.first.name}: ${firstPercentage}%, ${investmentPair.second.name}: ${secondPercentage}%`;
            });

            // Send scenarios to backend for processing
            const exploreData = {
                scenarios: scenarios,
                simulationCount: simulationCount,
                parameterType: 'allocations',
                changedPath: `${selectedInvestEvent.title || 'Investment Event'}.initialAllocations`,
                details: {
                    firstInvestment: investmentPair.first.name,
                    secondInvestment: investmentPair.second.name,
                    range: {
                        firstLower: allocationLowerBound,
                        firstUpper: allocationUpperBound,
                        secondLower: secondAllocationLowerBound,
                        secondUpper: secondAllocationUpperBound,
                        step: allocationSteps
                    }
                }
            };

            // Show loading state
            setIsProcessing(true);
            setFeedbackMessage(`Processing ${scenarios.length} scenarios with ${simulationCount} simulations each...`);

            // Call the backend API
            fetch('/api/explore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exploreData),
            })
                .then(response => response.json())
                .then(data => {
                    setIsProcessing(false);
                    setFeedbackMessage(`Success: ${data.message}`);
                    console.log('Exploration response:', data);
                })
                .catch(error => {
                    setIsProcessing(false);
                    setFeedbackMessage(`Error: ${error.message}`);
                    console.error('Exploration error:', error);
                });

            return;
        } else {
            setFeedbackMessage(`Parameter ${parameter} is not yet supported for exploration.`);
        }
    };

    // Helper function for simple parameter explorations
    const handleGenericExploration = (paramType, itemName) => {
        const data = {
            parameter: paramType,
            selectedScenario: selectedScenario,
            itemName: itemName,
            min: parameterRange.min,
            max: parameterRange.max,
            step: parameterRange.step
        };

        sendExplorationRequest(data);
    };

    // Helper function for event series selection
    const getEventSeriesIdentifier = (eventSeries) => {
        return eventSeries.title || eventSeries.name || 'Unknown Event';
    };

    // Function to send exploration request to the backend
    const sendExplorationRequest = (data) => {
        // Generate scenarios based on parameter type
        const scenarios = [];
        let stepValues = [];
        let adjustedStepSize = null; // Add a variable to store the adjusted step size

        // Define max allowed scenarios
        const MAX_SCENARIOS = 15;

        // If there's an event series, log its properties for debugging
        if (data.parameter === 'eventSeriesTiming' || data.parameter === 'eventSeriesAmount') {
            console.log('===== EVENT SERIES DEBUG INFO =====');
            console.log('Selected Event Series:', data.selectedEventSeries);
            console.log('Event Series Properties:');
            for (const key in data.selectedEventSeries) {
                console.log(`  ${key}: ${JSON.stringify(data.selectedEventSeries[key])}`);
            }
            console.log('=================================');
        }

        // Create step values based on bounds and step size
        if (data.parameter === 'eventSeriesTiming' || data.parameter === 'eventSeriesAmount') {
            // Calculate step values for ranges with numeric steps
            const lowerBound = data.lowerBound;
            const upperBound = data.upperBound;
            let stepSize = data.steps;

            // Ensure reasonable step size to prevent too many scenarios
            const range = upperBound - lowerBound;
            const minStepSize = Math.max(1, Math.ceil(range / MAX_SCENARIOS));

            if (stepSize < minStepSize) {
                console.warn(`Step size ${stepSize} is too small for range ${range}, adjusting to ${minStepSize}`);
                stepSize = minStepSize;
            }

            // Store the adjusted step size for logging
            adjustedStepSize = stepSize;

            // Generate step values
            for (let value = lowerBound; value <= upperBound; value += stepSize) {
                stepValues.push(Math.round(value));

                // Safety check to prevent infinite or extremely large arrays
                if (stepValues.length >= MAX_SCENARIOS) {
                    console.warn(`Maximum number of scenarios (${MAX_SCENARIOS}) reached, truncating`);
                    break;
                }
            }

            // Make sure upper bound is included if we haven't reached max scenarios
            if (stepValues.length < MAX_SCENARIOS && stepValues[stepValues.length - 1] !== upperBound) {
                stepValues.push(upperBound);
            }

            // Remove duplicates that might occur due to rounding
            stepValues = [...new Set(stepValues)];

            // For each step value, create a scenario
            stepValues.forEach(stepValue => {
                // Create a deep copy of the scenario
                const modifiedScenario = JSON.parse(JSON.stringify(data.selectedScenario));

                // Give it a descriptive name
                if (data.parameter === 'eventSeriesTiming') {
                    const attributeLabel = data.modifyAttribute === 'startYear' ? 'Start Year' : 'Duration';
                    modifiedScenario.name = `${data.selectedScenario.name} (${data.selectedEventSeries.name || data.selectedEventSeries.title || 'Event'}: ${attributeLabel} = ${stepValue})`;

                    // Use the stored index to find the event series directly - much more reliable
                    const eventSeriesIndex = data.selectedEventSeriesIndex;
                    console.log(`Using index ${eventSeriesIndex} to update event`);

                    if (eventSeriesIndex !== -1 && eventSeriesIndex < modifiedScenario.eventSeries.length) {
                        // Modify the event series based on the attribute
                        const targetEventSeries = modifiedScenario.eventSeries[eventSeriesIndex];
                        console.log(`Modifying event series: ${targetEventSeries.name || targetEventSeries.title || 'Unknown'}`);

                        if (data.modifyAttribute === 'startYear') {
                            // Update start year
                            targetEventSeries.startYear = stepValue;
                            targetEventSeries.startYearType = 'fixed';
                            console.log(`Updated startYear to ${stepValue}`);
                        } else if (data.modifyAttribute === 'duration') {
                            // Update duration - use durationFixed as the property name
                            targetEventSeries.durationFixed = stepValue;
                            targetEventSeries.durationType = 'fixed';
                            console.log(`Updated durationFixed to ${stepValue}`);
                        }
                        console.log('Updated event series:', targetEventSeries);
                    } else {
                        console.error(`Invalid event series index: ${eventSeriesIndex} (total: ${modifiedScenario.eventSeries.length})`);
                    }
                } else if (data.parameter === 'eventSeriesAmount') {
                    modifiedScenario.name = `${data.selectedScenario.name} (${data.selectedEventSeries.name || data.selectedEventSeries.title || 'Event'}: Amount = ${stepValue})`;

                    // Use the stored index to find the event series directly
                    const eventSeriesIndex = data.selectedEventSeriesIndex;

                    if (eventSeriesIndex !== -1 && eventSeriesIndex < modifiedScenario.eventSeries.length) {
                        // Update the amount in the event series
                        modifiedScenario.eventSeries[eventSeriesIndex].initialAmount = stepValue;
                        modifiedScenario.eventSeries[eventSeriesIndex].amount = stepValue;
                    } else {
                        console.error(`Invalid event series index: ${eventSeriesIndex} (total: ${modifiedScenario.eventSeries.length})`);
                    }
                }

                scenarios.push(modifiedScenario);
            });
        } else if (data.parameter === 'rothConversion') {
            // For boolean toggle parameters, just create one modified scenario
            const modifiedScenario = JSON.parse(JSON.stringify(data.selectedScenario));
            modifiedScenario.name = `${data.selectedScenario.name} (Roth Conversion: ${data.toggleValue ? 'Enabled' : 'Disabled'})`;

            // Update the Roth conversion settings
            if (data.toggleValue) {
                // Enable Roth conversion
                if (!modifiedScenario.rothOptimizationStartYear) {
                    const currentYear = new Date().getFullYear();
                    modifiedScenario.rothOptimizationStartYear = currentYear;
                    modifiedScenario.rothOptimizationEndYear = currentYear + 20; // Default 20-year span
                }
            } else {
                // Disable Roth conversion
                modifiedScenario.rothOptimizationStartYear = null;
                modifiedScenario.rothOptimizationEndYear = null;
            }

            scenarios.push(modifiedScenario);
        } else {
            // For other parameter types (amount, date, recurringAmount)
            // Create scenarios based on min, max, step
            const min = data.min;
            const max = data.max;
            let step = data.step;

            // Ensure reasonable step size
            const range = max - min;
            const minStepSize = Math.max(1, Math.ceil(range / MAX_SCENARIOS));

            if (step < minStepSize) {
                console.warn(`Step size ${step} is too small for range ${range}, adjusting to ${minStepSize}`);
                step = minStepSize;
            }

            // Store the adjusted step size for logging
            adjustedStepSize = step;

            // Generate step values
            for (let value = min; value <= max; value += step) {
                stepValues.push(value);

                // Safety check to prevent infinite or extremely large arrays
                if (stepValues.length >= MAX_SCENARIOS) {
                    console.warn(`Maximum number of scenarios (${MAX_SCENARIOS}) reached, truncating`);
                    break;
                }
            }

            // Make sure max value is included if we haven't reached max scenarios
            if (stepValues.length < MAX_SCENARIOS && stepValues[stepValues.length - 1] !== max) {
                stepValues.push(max);
            }

            // Remove duplicates
            stepValues = [...new Set(stepValues)];

            stepValues.forEach(value => {
                const modifiedScenario = JSON.parse(JSON.stringify(data.selectedScenario));

                // Find the specified event in the scenario
                if (data.itemName && data.parameter) {
                    const eventIndex = modifiedScenario.eventSeries.findIndex(
                        es => es.title === data.itemName
                    );

                    if (eventIndex !== -1) {
                        const event = modifiedScenario.eventSeries[eventIndex];

                        // Update the appropriate field based on parameter type
                        if (data.parameter === 'amount') {
                            event.amount = value;
                            event.initialAmount = value;
                        } else if (data.parameter === 'date') {
                            // Format date: YYYY-MM-DD
                            // For simplicity, just changing the year
                            const currentDate = event.date || '2023-01-01';
                            const [_, month, day] = currentDate.split('-');
                            event.date = `${value}-${month || '01'}-${day || '01'}`;
                        } else if (data.parameter === 'recurringAmount') {
                            event.recurringAmount = value;
                        }
                    }
                }

                modifiedScenario.name = `${data.selectedScenario.name} (${data.parameter}: ${value})`;
                scenarios.push(modifiedScenario);
            });
        }

        // Prepare data for the backend
        const exploreData = {
            scenarios: scenarios,
            simulationCount: simulationCount,
            parameterType: data.parameter,
            changedPath: data.itemName || data.parameter,
            details: data,
            stepValues: stepValues
        };

        // Log detailed information about what we're sending
        console.log('===== EXPLORATION REQUEST DATA =====');
        console.log('Parameter type:', data.parameter);
        console.log('Simulation count:', simulationCount);
        console.log('Step values:', stepValues);
        console.log('Number of scenarios:', scenarios.length);
        console.log('Original step size:', data.steps || data.step);
        console.log('Adjusted step size:', adjustedStepSize);
        console.log('Scenarios:', scenarios);
        console.log('Full request payload:', exploreData);
        console.log('===================================');

        // Show loading state
        setIsProcessing(true);
        setFeedbackMessage(`Processing ${scenarios.length} scenarios for ${data.parameter} exploration with ${simulationCount} simulations each...`);

        // Call the backend API
        fetch('/api/explore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(exploreData),
        })
            .then(response => response.json())
            .then(data => {
                setIsProcessing(false);
                setFeedbackMessage(`Success: ${data.message}`);
                console.log('===== EXPLORATION RESPONSE =====');
                console.log('Response data:', data);
                console.log('===============================');
            })
            .catch(error => {
                setIsProcessing(false);
                setFeedbackMessage(`Error: ${error.message}`);
                console.error('===== EXPLORATION ERROR =====');
                console.error('Error:', error);
                console.error('=============================');
            });
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
                <h1 className="text-3xl font-bold text-gray-900">Parameter Exploration</h1>
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
                        <div className="max-w-xl">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">Select Parameter to Explore</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Parameter
                                    </label>
                                    <select
                                        value={parameter}
                                        onChange={(e) => setParameter(e.target.value)}
                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {explorationParameters.map(param => (
                                            <option key={param.id} value={param.id}>
                                                {param.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Simulation count field - always visible */}
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
                                        <p className="ml-4 text-xs text-gray-500">Number of simulations to run for each scenario</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Range
                                    </label>
                                    {parameter === 'rothConversion' ? (
                                        <div className="flex items-center space-x-4 p-2 border rounded-md bg-gray-50">
                                            <span className="text-sm text-gray-600">Disabled</span>
                                            <div className="relative inline-block w-10 mr-2 align-middle select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={parameterRange.min === 1}
                                                    onChange={(e) => setParameterRange({
                                                        min: e.target.checked ? 1 : 0,
                                                        max: e.target.checked ? 1 : 0,
                                                        step: 1
                                                    })}
                                                    className="sr-only"
                                                    id="toggleRoth"
                                                />
                                                <label
                                                    htmlFor="toggleRoth"
                                                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in ${parameterRange.min === 1 ? 'bg-blue-500' : 'bg-gray-300'
                                                        }`}
                                                >
                                                    <span
                                                        className={`block h-6 w-6 rounded-full bg-white transform transition-transform duration-200 ease-in ${parameterRange.min === 1 ? 'translate-x-4' : 'translate-x-0'
                                                            }`}
                                                    ></span>
                                                </label>
                                            </div>
                                            <span className="text-sm text-gray-600">Enabled</span>
                                        </div>
                                    ) : parameter === 'eventSeriesTiming' ? (
                                        <div className="space-y-4">
                                            {/* Event series selection dropdown */}
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Event Series
                                                </label>
                                                <select
                                                    value={selectedEventSeries ? selectedScenario.eventSeries.findIndex(es => es.name === selectedEventSeries.name) : 0}
                                                    onChange={(e) => {
                                                        const index = parseInt(e.target.value);
                                                        const series = selectedScenario.eventSeries[index];
                                                        setSelectedEventSeries(series);
                                                        setSelectedEventSeriesIndex(index);

                                                        // Log detailed info about the selected event series
                                                        console.log('===== SELECTED EVENT SERIES =====');
                                                        console.log('Event Series Name:', series.name);
                                                        console.log('Event Series Title:', series.title);
                                                        console.log('Event Series Type:', series.type);
                                                        console.log('Event Series Index:', index);
                                                        console.log('Full Event Series Object:', series);
                                                        console.log('================================');

                                                        // Update bounds based on the selected event's amount
                                                        const amount = series.initialAmount || 0;
                                                        setEventSeriesLowerBound(amount);
                                                        setEventSeriesUpperBound(amount * 2);
                                                        setEventSeriesSteps(Math.max(1, Math.round(amount / 5)));
                                                    }}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={!selectedScenario || !selectedScenario.eventSeries || selectedScenario.eventSeries.length === 0}
                                                >
                                                    {selectedScenario && selectedScenario.eventSeries &&
                                                        selectedScenario.eventSeries.map((eventSeries, index) => (
                                                            <option key={eventSeries.name} value={index}>
                                                                {eventSeries.name} ({eventSeries.type})
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            {/* Dropdown for attribute to modify (startYear or duration) */}
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Select Attribute to Modify</label>
                                                <select
                                                    value={eventSeriesModifyAttribute}
                                                    onChange={(e) => setEventSeriesModifyAttribute(e.target.value)}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="startYear">Start Year</option>
                                                    <option value="duration">Duration</option>
                                                </select>
                                            </div>

                                            {/* Fields for lower and upper bounds */}
                                            <div className="flex space-x-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-1">
                                                        {eventSeriesModifyAttribute === 'startYear' ? 'Earliest Start Year' : 'Shortest Duration'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={eventSeriesLowerBound}
                                                        onChange={(e) => setEventSeriesLowerBound(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-1">
                                                        {eventSeriesModifyAttribute === 'startYear' ? 'Latest Start Year' : 'Longest Duration'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={eventSeriesUpperBound}
                                                        onChange={(e) => setEventSeriesUpperBound(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-1">Steps</label>
                                                    <input
                                                        type="number"
                                                        value={eventSeriesSteps}
                                                        min={2}
                                                        onChange={(e) => {
                                                            const inputValue = Math.max(2, Number(e.target.value));

                                                            // Calculate minimum step size to prevent too many scenarios
                                                            const range = eventSeriesUpperBound - eventSeriesLowerBound;
                                                            const minRecommendedStep = Math.max(1, Math.ceil(range / 15));

                                                            if (inputValue < minRecommendedStep) {
                                                                console.warn(`Step size ${inputValue} may create too many scenarios, recommended: ${minRecommendedStep}`);
                                                            }

                                                            setEventSeriesSteps(inputValue);
                                                        }}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    {eventSeriesSteps < Math.ceil((eventSeriesUpperBound - eventSeriesLowerBound) / 15) && (
                                                        <p className="text-xs text-orange-600 mt-1">
                                                            Step size may create too many scenarios. Consider a larger value.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : parameter === 'eventSeriesAmount' ? (
                                        // Event Series Amount UI
                                        <div className="space-y-4">
                                            {/* Event series selection dropdown - only income and expense types */}
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Income or Expense Event
                                                </label>
                                                <select
                                                    value={selectedEventSeries ? selectedScenario.eventSeries.findIndex(es => es.name === selectedEventSeries.name) : 0}
                                                    onChange={(e) => {
                                                        const index = parseInt(e.target.value);
                                                        const series = selectedScenario.eventSeries[index];
                                                        setSelectedEventSeries(series);
                                                        setSelectedEventSeriesIndex(index);

                                                        // Log detailed info about the selected event series
                                                        console.log('===== SELECTED EVENT SERIES =====');
                                                        console.log('Event Series Name:', series.name);
                                                        console.log('Event Series Title:', series.title);
                                                        console.log('Event Series Type:', series.type);
                                                        console.log('Event Series Index:', index);
                                                        console.log('Full Event Series Object:', series);
                                                        console.log('================================');

                                                        // Update bounds based on the selected event's amount
                                                        const amount = series.initialAmount || 0;
                                                        setEventSeriesLowerBound(amount);
                                                        setEventSeriesUpperBound(amount * 2);
                                                        setEventSeriesSteps(Math.max(1, Math.round(amount / 5)));
                                                    }}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={!selectedScenario || !selectedScenario.eventSeries || selectedScenario.eventSeries.length === 0}
                                                >
                                                    {selectedScenario && selectedScenario.eventSeries &&
                                                        selectedScenario.eventSeries
                                                            // Only show income and expense types
                                                            .filter(es => es.type === 'income' || es.type === 'expense')
                                                            .map((eventSeries, index) => {
                                                                // Find the actual index in the original array
                                                                const originalIndex = selectedScenario.eventSeries.findIndex(
                                                                    es => es.name === eventSeries.name
                                                                );

                                                                return (
                                                                    <option key={eventSeries.name} value={originalIndex}>
                                                                        {eventSeries.name} ({eventSeries.type}) - {formatCurrency(eventSeries.initialAmount || 0)}
                                                                    </option>
                                                                );
                                                            })
                                                    }
                                                </select>
                                            </div>

                                            {/* Fields for lower and upper bounds */}
                                            <div className="flex space-x-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-1">
                                                        Lowest Amount
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={eventSeriesLowerBound}
                                                        onChange={(e) => setEventSeriesLowerBound(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-1">
                                                        Highest Amount
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={eventSeriesUpperBound}
                                                        onChange={(e) => setEventSeriesUpperBound(Number(e.target.value))}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-1">Steps</label>
                                                    <input
                                                        type="number"
                                                        value={eventSeriesSteps}
                                                        min={2}
                                                        onChange={(e) => {
                                                            const inputValue = Math.max(2, Number(e.target.value));

                                                            // Calculate minimum step size to prevent too many scenarios
                                                            const range = eventSeriesUpperBound - eventSeriesLowerBound;
                                                            const minRecommendedStep = Math.max(1, Math.ceil(range / 15));

                                                            if (inputValue < minRecommendedStep) {
                                                                console.warn(`Step size ${inputValue} may create too many scenarios, recommended: ${minRecommendedStep}`);
                                                            }

                                                            setEventSeriesSteps(inputValue);
                                                        }}
                                                        className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    {eventSeriesSteps < Math.ceil((eventSeriesUpperBound - eventSeriesLowerBound) / 15) && (
                                                        <p className="text-xs text-orange-600 mt-1">
                                                            Step size may create too many scenarios. Consider a larger value.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : parameter === 'allocations' ? (
                                        // Allocations UI
                                        <div className="space-y-4">
                                            {/* Invest event selection dropdown */}
                                            <div className="flex flex-col mb-4">
                                                <label className="mb-2">Select an Investment Event:</label>
                                                <select
                                                    className="p-2 border rounded"
                                                    value={selectedScenario.eventSeries.indexOf(selectedInvestEvent)}
                                                    onChange={(e) => {
                                                        const selectedIndex = parseInt(e.target.value);
                                                        const selectedEvent = selectedScenario.eventSeries[selectedIndex];
                                                        setSelectedInvestEvent(selectedEvent);

                                                        // Check if the event has a valid initialAllocations
                                                        if (selectedEvent.initialAllocations && Object.keys(selectedEvent.initialAllocations).length === 2) {
                                                            // Initialize the investment pair
                                                            const initialAllocations = selectedEvent.initialAllocations;
                                                            const investmentNames = Object.keys(initialAllocations);
                                                            const firstInvestment = {
                                                                name: investmentNames[0],
                                                                percentage: initialAllocations[investmentNames[0]]
                                                            };
                                                            const secondInvestment = {
                                                                name: investmentNames[1],
                                                                percentage: initialAllocations[investmentNames[1]]
                                                            };
                                                            setInvestmentPair({ first: firstInvestment, second: secondInvestment });

                                                            // Set bounds for allocation based on current values
                                                            // Ensure we provide a reasonable range around the current allocation
                                                            const currentPercentage = firstInvestment.percentage;
                                                            const range = 30; // Range of +/- 30% around current value
                                                            setAllocationLowerBound(Math.max(0, currentPercentage - range));
                                                            setAllocationUpperBound(Math.min(100, currentPercentage + range));
                                                            setAllocationSteps(10);
                                                        } else {
                                                            // Clear investment pair if not valid
                                                            setInvestmentPair(null);
                                                        }
                                                    }}
                                                >
                                                    {selectedScenario.eventSeries
                                                        .filter(es => es.type === 'invest')
                                                        .map((es, i) => {
                                                            const hasValidAllocation = es.initialAllocations && Object.keys(es.initialAllocations).length === 2;
                                                            return (
                                                                <option key={i} value={selectedScenario.eventSeries.indexOf(es)}>
                                                                    {es.title || `Investment ${i + 1}`} {hasValidAllocation ? '✓' : '(invalid allocation)'}
                                                                </option>
                                                            );
                                                        })}
                                                </select>
                                            </div>

                                            {selectedInvestEvent && !investmentPair && (
                                                <div className="p-3 bg-yellow-100 text-yellow-800 rounded mb-4">
                                                    <p className="font-semibold">Invalid Allocation</p>
                                                    <p>The selected investment event does not have a valid initialAllocations property or does not have exactly two investments. Please select a different investment event or update this event to include two investments in its initialAllocations.</p>
                                                </div>
                                            )}

                                            {investmentPair && (
                                                <>
                                                    <div className="flex flex-col space-y-4 mb-4">
                                                        <label className="font-medium mb-2">{investmentPair.first.name} Allocation Range</label>
                                                        <div className="flex space-x-4">
                                                            <div className="flex-1">
                                                                <label className="block text-xs text-gray-500 mb-1">Min %</label>
                                                                <input
                                                                    type="number"
                                                                    value={allocationLowerBound}
                                                                    onChange={(e) => setAllocationLowerBound(Number(e.target.value))}
                                                                    min={0}
                                                                    max={100}
                                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-xs text-gray-500 mb-1">Max %</label>
                                                                <input
                                                                    type="number"
                                                                    value={allocationUpperBound}
                                                                    onChange={(e) => setAllocationUpperBound(Number(e.target.value))}
                                                                    min={0}
                                                                    max={100}
                                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-xs text-gray-500 mb-1">Step %</label>
                                                                <input
                                                                    type="number"
                                                                    value={allocationSteps}
                                                                    onChange={(e) => {
                                                                        const inputValue = Math.max(1, Number(e.target.value));

                                                                        // Calculate minimum step size to prevent too many scenarios
                                                                        const range = allocationUpperBound - allocationLowerBound;
                                                                        const minRecommendedStep = Math.max(1, Math.ceil(range / 15));

                                                                        if (inputValue < minRecommendedStep) {
                                                                            console.warn(`Step size ${inputValue} may create too many scenarios, recommended: ${minRecommendedStep}`);
                                                                        }

                                                                        setAllocationSteps(inputValue);
                                                                    }}
                                                                    min={1}
                                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                                {allocationSteps < Math.ceil((allocationUpperBound - allocationLowerBound) / 15) && (
                                                                    <p className="text-xs text-orange-600 mt-1">
                                                                        Step size may create too many scenarios. Consider a larger value.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mt-4">
                                                            <label className="font-medium mb-2">{investmentPair.second.name} Allocation Range (Auto-calculated)</label>
                                                            <div className="flex space-x-4">
                                                                <div className="flex-1">
                                                                    <label className="block text-xs text-gray-500 mb-1">Min % = 100% - {investmentPair.first.name} Min %</label>
                                                                    <input
                                                                        type="number"
                                                                        value={secondAllocationLowerBound}
                                                                        disabled
                                                                        className="w-full p-2 border rounded-md bg-gray-100 border-gray-300 text-gray-900"
                                                                    />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-xs text-gray-500 mb-1">Max % = 100% - {investmentPair.first.name} Max %</label>
                                                                    <input
                                                                        type="number"
                                                                        value={secondAllocationUpperBound}
                                                                        disabled
                                                                        className="w-full p-2 border rounded-md bg-gray-100 border-gray-300 text-gray-900"
                                                                    />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-xs text-gray-500 mb-1">Step %</label>
                                                                    <input
                                                                        type="number"
                                                                        value={allocationSteps}
                                                                        disabled
                                                                        className="w-full p-2 border rounded-md bg-gray-100 border-gray-300 text-gray-900"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-gray-500 mt-2">
                                                            At each point in the exploration, {investmentPair.first.name} and {investmentPair.second.name} percentages will always sum to 100%.
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex space-x-4">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 mb-1">Min</label>
                                                <input
                                                    type="number"
                                                    value={parameterRange.min}
                                                    onChange={(e) => setParameterRange({ ...parameterRange, min: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 mb-1">Max</label>
                                                <input
                                                    type="number"
                                                    value={parameterRange.max}
                                                    onChange={(e) => setParameterRange({ ...parameterRange, max: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 mb-1">Step</label>
                                                <input
                                                    type="number"
                                                    value={parameterRange.step}
                                                    onChange={(e) => setParameterRange({ ...parameterRange, step: Number(e.target.value) })}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    )}
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
                                    {isProcessing ? 'Processing...' : 'Explore Parameter'}
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
}

export default ExplorationPage; 