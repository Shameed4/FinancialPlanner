'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import pageVariants from "../components/PageAnimation";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LineChart } from '@mui/x-charts/LineChart';

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

// Add new helper function for chart formatting
const formatValue = (value, type) => {
    if (type === 'probability') {
        return `${value.toFixed(0)}%`;
    }
    return formatCurrency(value);
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
    const [simulationCount, setSimulationCount] = useState(1);
    // Second investment's bounds are calculated as complementary values
    const secondAllocationLowerBound = allocationLowerBound !== null ? 100 - allocationUpperBound : null;
    const secondAllocationUpperBound = allocationUpperBound !== null ? 100 - allocationLowerBound : null;

    const { data: session } = useSession();

    // Add state for feedback messages
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Add a state variable to track the index of the selected event series
    const [selectedEventSeriesIndex, setSelectedEventSeriesIndex] = useState(-1);

    // Add state for exploration results
    const [explorationResults, setExplorationResults] = useState(null);
    const [displayChart, setDisplayChart] = useState('timeSeries'); // 'timeSeries' or 'parameterValue'
    const [selectedMetric, setSelectedMetric] = useState('probability'); // 'probability' or 'medianInvestment'

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
        // Reset feedback and results
        setFeedbackMessage('');
        setExplorationResults(null);

        // Check if a scenario is selected
        if (!selectedScenario) {
            setFeedbackMessage('Please select a scenario to explore');
            return;
        }

        if (parameter === 'allocations') {
            // Check if an investment event is selected
            if (!selectedInvestEvent) {
                setFeedbackMessage('Please select an investment event to explore');
                return;
            }

            // Check if we have a valid investment pair
            if (!investmentPair || !investmentPair.first || !investmentPair.second) {
                setFeedbackMessage('Please select investment allocations to explore');
                return;
            }

            console.log(`Exploring allocations for ${investmentPair.first.name} and ${investmentPair.second.name} in ${selectedInvestEvent.name || selectedInvestEvent.title}`);

            // Array to hold each step value
            const stepValues = [];
            // Arrays to hold scenario data for each step
            const scenarios = [];

            // Calculate step size and generate values
            const stepSize = allocationSteps;
            for (let value = allocationLowerBound; value <= allocationUpperBound; value += stepSize) {
                stepValues.push(Math.round(value)); // Round to avoid floating point issues
            }

            // Make sure upper bound is included
            if (stepValues[stepValues.length - 1] !== allocationUpperBound) {
                stepValues.push(allocationUpperBound);
            }

            console.log(`Generated ${stepValues.length} allocation values:`, stepValues);

            // Create scenarios for each step value
            stepValues.forEach(firstPercentage => {
                // Get complementary percentage
                const secondPercentage = 100 - firstPercentage;

                console.log(`Creating scenario with ${investmentPair.first.name}: ${firstPercentage}%, ${investmentPair.second.name}: ${secondPercentage}%`);

                // Create a deep copy of the scenario
                const modifiedScenario = JSON.parse(JSON.stringify(selectedScenario));

                // Find the investment event in the copy (by name/title AND type)
                const eventIndex = modifiedScenario.eventSeries.findIndex(
                    es => (
                        (es.title === selectedInvestEvent.title || es.name === selectedInvestEvent.name) &&
                        es.type === 'invest'
                    )
                );

                if (eventIndex === -1) {
                    console.error(`Investment event "${selectedInvestEvent.title || selectedInvestEvent.name}" not found in scenario.`);
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
                scenarios.push({
                    parameterValue: firstPercentage, // Use the specific first percentage value for this scenario
                    scenario: modifiedScenario
                });
            });

            // Display information about the generated scenarios
            const allocationPairs = stepValues.map((firstPercentage, index) => {
                const secondPercentage = 100 - firstPercentage;
                return `Scenario ${index + 1}: ${investmentPair.first.name}: ${firstPercentage}%, ${investmentPair.second.name}: ${secondPercentage}%`;
            });

            console.log('===== ALLOCATION SCENARIOS SUMMARY =====');
            console.log('Generated the following allocation scenarios:');
            allocationPairs.forEach(pair => console.log(pair));
            console.log('Each scenario is a separate test with a specific allocation.');
            console.log('Number of scenarios:', scenarios.length);
            console.log('Step values:', stepValues);
            console.log('=========================================');

            // Send scenarios to backend for processing
            const exploreData = {
                scenarios: scenarios,
                simulationCount: simulationCount,
                parameterType: 'allocations',
                changedPath: `${selectedInvestEvent.title || selectedInvestEvent.name || 'Investment Event'}.initialAllocations`,
                stepValues: stepValues, // Include the step values for reference
                parameterInfo: {
                    name: 'Allocations',
                    id: 'allocations',
                },
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
                },
                userName: session?.user?.name,
            };

            // Debug: Verify scenarios structure
            console.log("Final scenarios structure check:");
            scenarios.forEach((scenario, index) => {
                // Find the event index in this specific scenario
                const thisEventIndex = scenario.scenario.eventSeries.findIndex(
                    es => (es.title === selectedInvestEvent.title || es.name === selectedInvestEvent.name) && es.type === 'invest'
                );

                if (thisEventIndex !== -1) {
                    console.log(`Scenario ${index}: parameterValue=${scenario.parameterValue}, first=${scenario.scenario.eventSeries[thisEventIndex].initialAllocations[investmentPair.first.name]}%, second=${scenario.scenario.eventSeries[thisEventIndex].initialAllocations[investmentPair.second.name]}%`);
                } else {
                    console.log(`Scenario ${index}: parameterValue=${scenario.parameterValue}, but event not found in scenario`);
                }
            });

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
                    console.log('===== EXPLORATION RESPONSE =====');
                    console.log('Response data:', data);

                    // Store the exploration results if they exist
                    if (data.results) {
                        console.log('Results structure:', Object.keys(data.results));
                        console.log('Result keys (parameter values):', Object.keys(data.results));

                        // Log specific details about each result
                        Object.entries(data.results).forEach(([paramValue, result]) => {
                            console.log(`Result for parameter value ${paramValue}:`, {
                                finalSuccessProb: result.finalSuccessProb,
                                finalMedianInvest: result.finalMedianInvest,
                                hasTimeSeries: !!result.successProbTimeSeries || !!result.medianInvestTimeSeries
                            });
                        });

                        setExplorationResults(data.results);
                    } else {
                        console.warn('No results data in the response');
                    }

                    console.log('===============================');
                })
                .catch(error => {
                    setIsProcessing(false);
                    setFeedbackMessage(`Error: ${error.message}`);
                    console.error('===== EXPLORATION ERROR =====');
                    console.error('Error:', error);
                    console.error('=============================');
                });

            return;
        } else if (parameter === 'rothConversion') {
            // Implementation for Roth conversion parameter
            const data = {
                parameter: 'rothConversion',
                selectedScenario: selectedScenario,
                toggleValue: parameterRange.min === 0 ? false : true
            };

            sendExplorationRequest(data);
        } else if (parameter === 'amount') {
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
        // Reset feedback and results
        setFeedbackMessage('');
        setExplorationResults(null);

        // Calculate step size based on range and number of desired points
        let range, stepValues, adjustedStepSize;
        let scenarios = [];

        // Set to true to show loading state
        setIsProcessing(true);

        // Generate appropriate values for each parameter type
        if (['amount', 'recurringAmount', 'eventSeriesAmount'].includes(data.parameter)) {
            range = data.upperBound - data.lowerBound;
            const steps = data.steps || 10;
            adjustedStepSize = Math.max(1, Math.round(range / steps));

            // Generate step values
            stepValues = [];
            for (let value = data.lowerBound; value <= data.upperBound; value += adjustedStepSize) {
                stepValues.push(Math.round(value));
                // Safety check to prevent too many values
                if (stepValues.length >= 10) break;
            }

            // Make sure upper bound is included
            if (stepValues[stepValues.length - 1] !== data.upperBound) {
                stepValues.push(data.upperBound);
            }
        } else if (data.parameter === 'eventSeriesTiming') {
            range = data.upperBound - data.lowerBound;
            const steps = data.steps || Math.min(10, range);
            adjustedStepSize = Math.max(1, Math.round(range / steps));

            // Generate step values
            stepValues = [];
            for (let value = data.lowerBound; value <= data.upperBound; value += adjustedStepSize) {
                stepValues.push(Math.round(value));
                // Safety check to prevent too many values
                if (stepValues.length >= 10) break;
            }

            // Make sure upper bound is included
            if (stepValues[stepValues.length - 1] !== data.upperBound) {
                stepValues.push(data.upperBound);
            }
        } else if (data.parameter === 'rothConversion') {
            // For Roth conversion, we only have true/false
            stepValues = data.toggleValue ? ['true'] : ['false', 'true'];
        }

        console.log(`Generated ${stepValues ? stepValues.length : 0} values for parameter ${data.parameter}:`, stepValues);

        // Create scenarios for the different parameter values
        if (stepValues && stepValues.length > 0) {
            if (data.parameter === 'rothConversion') {
                // Special case for Roth conversion (boolean parameter)
                stepValues.forEach(isEnabled => {
                    const modifiedScenario = JSON.parse(JSON.stringify(data.selectedScenario));
                    modifiedScenario.name = `${data.selectedScenario.name} (Roth Conversion: ${isEnabled === 'true' ? 'Enabled' : 'Disabled'})`;

                    // Find Roth conversion setting and toggle it
                    modifiedScenario.rothConversion = isEnabled === 'true';

                    scenarios.push({
                        parameterValue: isEnabled, // 'true' or 'false' as string
                        scenario: modifiedScenario
                    });
                });
            } else if (data.parameter === 'eventSeriesTiming') {
                stepValues.forEach(stepValue => {
                    // Create a deep copy of the scenario
                    const modifiedScenario = JSON.parse(JSON.stringify(data.selectedScenario));

                    // Give it a descriptive name
                    if (data.parameter === 'eventSeriesTiming') {
                        const attributeLabel = data.modifyAttribute === 'startYear' ? 'Start Year' : 'Duration';
                        modifiedScenario.name = `${data.selectedScenario.name} (${data.selectedEventSeries.name || data.selectedEventSeries.title || 'Event'}: ${attributeLabel} = ${stepValue})`;

                        // Use the stored index to find the event series directly
                        const eventSeriesIndex = data.selectedEventSeriesIndex;
                        console.log(`Using index ${eventSeriesIndex} to update event`);

                        // Check if we have a valid index
                        if (eventSeriesIndex === undefined || eventSeriesIndex === null || eventSeriesIndex < 0) {
                            console.warn(`No valid eventSeriesIndex provided, trying to find by name/title instead`);
                            // Try to find the event series by name or title as fallback
                            const foundIndex = modifiedScenario.eventSeries.findIndex(es =>
                                (data.selectedEventSeries.name && es.name === data.selectedEventSeries.name) ||
                                (data.selectedEventSeries.title && es.title === data.selectedEventSeries.title)
                            );

                            if (foundIndex !== -1) {
                                console.log(`Found event series at index ${foundIndex} by name/title`);
                                // Use the found index instead
                                const targetEventSeries = modifiedScenario.eventSeries[foundIndex];
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
                                console.error(`Could not find event series by name or title`);
                            }
                        } else if (eventSeriesIndex !== -1 && eventSeriesIndex < modifiedScenario.eventSeries.length) {
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
                    }

                    scenarios.push({
                        parameterValue: stepValue, // The specific value being tested
                        scenario: modifiedScenario // The scenario modified for this value
                    });
                });
            } else if (data.parameter === 'eventSeriesAmount') {
                stepValues.forEach(stepValue => {
                    const modifiedScenario = JSON.parse(JSON.stringify(data.selectedScenario));

                    modifiedScenario.name = `${data.selectedScenario.name} (${data.selectedEventSeries.name || data.selectedEventSeries.title || 'Event'}: Amount = ${stepValue})`;

                    // Use the stored index to find the event series directly
                    const eventSeriesIndex = data.selectedEventSeriesIndex;
                    console.log(`Using index ${eventSeriesIndex} to update event amount`);

                    // Check if we have a valid index
                    if (eventSeriesIndex === undefined || eventSeriesIndex === null || eventSeriesIndex < 0) {
                        console.warn(`No valid eventSeriesIndex provided, trying to find by name/title instead`);
                        // Try to find the event series by name or title as fallback
                        const foundIndex = modifiedScenario.eventSeries.findIndex(es =>
                            (data.selectedEventSeries.name && es.name === data.selectedEventSeries.name) ||
                            (data.selectedEventSeries.title && es.title === data.selectedEventSeries.title)
                        );

                        if (foundIndex !== -1) {
                            console.log(`Found event series at index ${foundIndex} by name/title`);
                            // Update the amount in the event series
                            modifiedScenario.eventSeries[foundIndex].initialAmount = stepValue;
                            modifiedScenario.eventSeries[foundIndex].amount = stepValue;
                            console.log(`Updated amount to ${stepValue}`);
                        } else {
                            console.error(`Could not find event series by name or title`);
                        }
                    } else if (eventSeriesIndex !== -1 && eventSeriesIndex < modifiedScenario.eventSeries.length) {
                        // Update the amount in the event series
                        modifiedScenario.eventSeries[eventSeriesIndex].initialAmount = stepValue;
                        modifiedScenario.eventSeries[eventSeriesIndex].amount = stepValue;
                        console.log(`Updated amount to ${stepValue}`);
                    } else {
                        console.error(`Invalid event series index: ${eventSeriesIndex} (total: ${modifiedScenario.eventSeries.length})`);
                    }

                    scenarios.push({
                        parameterValue: stepValue, // The specific value being tested
                        scenario: modifiedScenario // The scenario modified for this value
                    });
                });
            } else {
                // Generic parameter handling for things like amount, date, recurringAmount
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
                    scenarios.push({
                        parameterValue: value, // Use the specific value being tested
                        scenario: modifiedScenario // The scenario modified for this value
                    });
                });
            }
        }

        // Prepare data for the backend
        const exploreData = {
            scenarios: scenarios, // Use the correctly structured array
            simulationCount: simulationCount,
            // Add parameterInfo for context
            parameterInfo: {
                name: explorationParameters.find(p => p.id === data.parameter)?.name || data.parameter,
                id: data.parameter,
                // Add more context if needed
            },
            stepValues: stepValues, // Send the values tested
            // baseSeed: "your-seed-value" // Optional
            userName: session?.user?.name,
        };

        // Log detailed information about what we're sending
        console.log('===== EXPLORATION REQUEST DATA =====');
        console.log('Parameter type:', data.parameter);
        console.log('Simulation count:', simulationCount);
        console.log('Step values:', stepValues);
        console.log('Number of scenarios:', scenarios.length);
        console.log('Original step size:', data.steps || data.step);
        console.log('Adjusted step size:', adjustedStepSize);

        // Log each scenario with its parameter value
        console.log('Scenarios details:');
        scenarios.forEach((scenario, index) => {
            console.log(`Scenario ${index + 1}: parameterValue = ${scenario.parameterValue}, name = ${scenario.scenario.name}`);
        });

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

                // Store the exploration results if they exist
                if (data.results) {
                    console.log('Results structure:', Object.keys(data.results));
                    console.log('Result keys (parameter values):', Object.keys(data.results));

                    // Log specific details about each result
                    Object.entries(data.results).forEach(([paramValue, result]) => {
                        console.log(`Result for parameter value ${paramValue}:`, {
                            finalSuccessProb: result.finalSuccessProb,
                            finalMedianInvest: result.finalMedianInvest,
                            hasTimeSeries: !!result.successProbTimeSeries || !!result.medianInvestTimeSeries
                        });
                    });

                    setExplorationResults(data.results);
                } else {
                    console.warn('No results data in the response');
                }

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

    // Chart components for exploration results
    const TimeSeriesChart = ({ results }) => {
        if (!results || Object.keys(results).length === 0) {
            return <div className="p-4 bg-gray-50 rounded text-gray-600">No time series data available</div>;
        }

        // Extract parameter values (keys in results)
        // Check if this is a boolean parameter like Roth conversion
        const paramKeys = Object.keys(results);
        const isBooleanParam = paramKeys.every(key => key === 'true' || key === 'false');

        // Sort numerically for number params, or as boolean for boolean params
        const paramValues = isBooleanParam
            ? ['false', 'true'].filter(val => paramKeys.includes(val))
            : paramKeys.sort((a, b) => Number(a) - Number(b));

        // Log for debugging
        console.log('TimeSeriesChart - paramValues:', paramValues);
        console.log('TimeSeriesChart - isBooleanParam:', isBooleanParam);

        // Extract time series data based on selected metric
        const seriesData = paramValues.map(paramValue => {
            const data = results[paramValue];
            if (!data) {
                console.warn(`No data found for parameter value: ${paramValue}`);
                return { paramValue, series: [] };
            }

            // Check if the expected data structures exist
            if (selectedMetric === 'probability' && !data.successProbTimeSeries) {
                console.warn(`No successProbTimeSeries found for ${paramValue}`);
                return { paramValue, series: [] };
            }
            if (selectedMetric !== 'probability' && !data.medianInvestTimeSeries) {
                console.warn(`No medianInvestTimeSeries found for ${paramValue}`);
                return { paramValue, series: [] };
            }

            const series = selectedMetric === 'probability'
                ? data.successProbTimeSeries.map(point => ({
                    year: point.year,
                    value: point.probability
                }))
                : data.medianInvestTimeSeries.map(point => ({
                    year: point.year,
                    value: point.medianInvestment
                }));

            return {
                paramValue,
                series
            };
        }).filter(item => item.series.length > 0);

        // If no valid series data after filtering, show a message
        if (seriesData.length === 0) {
            return <div className="p-4 bg-yellow-50 rounded text-yellow-700">
                No valid time series data available for the selected metric.
            </div>;
        }

        // Extract all unique years across all series
        const allYears = [...new Set(
            seriesData.flatMap(s => s.series.map(point => point.year))
        )].sort((a, b) => a - b);

        // Prepare the chart data
        const chartSeries = seriesData.map(s => ({
            data: s.series.map(point => point.value),
            label: isBooleanParam
                ? `${s.paramValue === 'true' ? 'Enabled' : 'Disabled'}`
                : `Param: ${s.paramValue}`,
        }));

        return (
            <div className="p-4 bg-white rounded shadow text-black">
                <h3 className="font-semibold mb-2">
                    {selectedMetric === 'probability' ? 'Probability of Success' : 'Median Investment Value'} Over Time
                </h3>
                <div className="h-80">
                    <LineChart
                        xAxis={[{
                            data: allYears,
                            label: 'Year',
                            tickMinStep: 5
                        }]}
                        yAxis={[{
                            label: selectedMetric === 'probability' ? 'Probability (%)' : 'Value ($)',
                            tickFormatter: (value) => formatValue(value, selectedMetric),
                            min: selectedMetric === 'probability' ? 0 : undefined,
                            max: selectedMetric === 'probability' ? 100 : undefined
                        }]}
                        series={chartSeries}
                        height={300}
                        slotProps={{
                            legend: {
                                position: 'bottom',
                                itemwidth: 80
                            }
                        }}
                    />
                </div>
            </div>
        );
    };

    const ParameterValueChart = ({ results }) => {
        if (!results || Object.keys(results).length === 0) {
            return <div className="p-4 bg-gray-50 rounded text-gray-600">No parameter data available</div>;
        }

        // Check if this is a boolean parameter like Roth conversion
        const paramKeys = Object.keys(results);
        const isBooleanParam = paramKeys.every(key => key === 'true' || key === 'false');

        // Sort numerically for number params, or as boolean for boolean params
        const paramValues = isBooleanParam
            ? ['false', 'true'].filter(val => paramKeys.includes(val))
            : paramKeys.sort((a, b) => Number(a) - Number(b));

        // Log for debugging
        console.log('ParameterValueChart - paramValues:', paramValues);
        console.log('ParameterValueChart - isBooleanParam:', isBooleanParam);

        // Extract final values for each parameter value
        const finalValues = paramValues.map(paramValue => {
            const data = results[paramValue];
            if (!data) {
                console.warn(`No data found for parameter value: ${paramValue}`);
                return null;
            }

            // Check if we have the expected values
            if (selectedMetric === 'probability' && data.finalSuccessProb === undefined) {
                console.warn(`Missing finalSuccessProb for ${paramValue}`);
                return null;
            }
            if (selectedMetric !== 'probability' && data.finalMedianInvest === undefined) {
                console.warn(`Missing finalMedianInvest for ${paramValue}`);
                return null;
            }

            return {
                // For boolean params, use 0 and 1 for x-axis display
                paramValue: isBooleanParam
                    ? (paramValue === 'true' ? 1 : 0)
                    : Number(paramValue),
                paramLabel: isBooleanParam
                    ? (paramValue === 'true' ? 'Enabled' : 'Disabled')
                    : paramValue,
                value: selectedMetric === 'probability'
                    ? data.finalSuccessProb
                    : data.finalMedianInvest
            };
        }).filter(Boolean); // Remove any null entries

        // If no valid values after filtering, show message
        if (finalValues.length === 0) {
            return <div className="p-4 bg-yellow-50 rounded text-yellow-700">
                No valid data available for the selected metric.
            </div>;
        }

        return (
            <div className="text-black p-4 bg-white rounded shadow">
                <h3 className="font-semibold mb-2">
                    Final {selectedMetric === 'probability' ? 'Probability of Success' : 'Median Investment'} by Parameter Value
                </h3>
                <div className="h-80">
                    <LineChart
                        xAxis={[{
                            data: finalValues.map(d => d.paramValue),
                            label: 'Parameter Value',
                            tickMinStep: Math.max(1, Math.floor((finalValues[finalValues.length - 1]?.paramValue - finalValues[0]?.paramValue) / 10)),
                            // For boolean parameters, use custom formatter
                            valueFormatter: isBooleanParam
                                ? (value) => value === 1 ? 'Enabled' : 'Disabled'
                                : undefined
                        }]}
                        yAxis={[{
                            label: selectedMetric === 'probability' ? 'Probability (%)' : 'Value ($)',
                            tickFormatter: (value) => formatValue(value, selectedMetric),
                            min: selectedMetric === 'probability' ? 0 : undefined,
                            max: selectedMetric === 'probability' ? 100 : undefined
                        }]}
                        series={[{
                            data: finalValues.map(d => d.value),
                            label: selectedMetric === 'probability' ? 'Success Probability' : 'Median Investment',
                            showMark: true,
                            color: selectedMetric === 'probability' ? '#4CAF50' : '#2196F3'
                        }]}
                        height={300}
                    />
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
                        <div className="max-w-xl text-black">
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
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Investment Event
                                                </label>
                                                <select
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    value=""
                                                    onChange={(e) => {
                                                        if (!e.target.value) return; // Handle empty selection
                                                        const selectedInvestEventIndex = parseInt(e.target.value);
                                                        const investEvents = selectedScenario.eventSeries.filter(es => es.type === 'invest');
                                                        const selectedEvent = investEvents[selectedInvestEventIndex];

                                                        // Only proceed if event has initialAllocations with at least 2 items
                                                        if (selectedEvent && selectedEvent.initialAllocations &&
                                                            Object.keys(selectedEvent.initialAllocations).length >= 2) {

                                                            setSelectedInvestEvent(selectedEvent);
                                                            console.log(`Selected investment event: "${selectedEvent.name || selectedEvent.title}" (type: ${selectedEvent.type})`);

                                                            // Get allocation keys
                                                            const allocationKeys = Object.keys(selectedEvent.initialAllocations);

                                                            // Create the investment pair
                                                            const firstInvestment = {
                                                                name: allocationKeys[0],
                                                                percentage: selectedEvent.initialAllocations[allocationKeys[0]]
                                                            };

                                                            const secondInvestment = {
                                                                name: allocationKeys[1],
                                                                percentage: selectedEvent.initialAllocations[allocationKeys[1]]
                                                            };

                                                            setInvestmentPair({ first: firstInvestment, second: secondInvestment });

                                                            // Set default allocation range based on current allocation
                                                            const currentPercentage = firstInvestment.percentage;
                                                            // Provide a reasonable range for exploration
                                                            const minValue = Math.max(0, Math.round(currentPercentage - 30));
                                                            const maxValue = Math.min(100, Math.round(currentPercentage + 30));

                                                            setAllocationLowerBound(minValue);
                                                            setAllocationUpperBound(maxValue);
                                                            setAllocationSteps(10);
                                                        } else {
                                                            setFeedbackMessage('Selected investment event must have at least two allocations.');
                                                        }
                                                    }}
                                                >
                                                    <option value="">-- Select Investment Event --</option>
                                                    {selectedScenario?.eventSeries
                                                        .filter(es => es.type === 'invest' && es.initialAllocations && Object.keys(es.initialAllocations).length >= 2)
                                                        .map((event, index) => (
                                                            <option key={index} value={index}>
                                                                {event.name || event.title || `Investment ${index + 1}`}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            {/* Allocation details */}
                                            {selectedInvestEvent && investmentPair && (
                                                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Allocation Details</h4>
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-gray-600">
                                                            Investment: <span className="font-semibold">{selectedInvestEvent.title || selectedInvestEvent.name}</span>
                                                        </p>
                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="bg-white p-3 rounded border border-blue-200">
                                                                <p className="text-xs font-medium mb-2">{investmentPair.first.name}</p>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Min %</label>
                                                                        <input
                                                                            type="number"
                                                                            value={allocationLowerBound}
                                                                            onChange={(e) => {
                                                                                const newMin = Number(e.target.value);
                                                                                if (newMin >= 0 && newMin <= 100 && newMin <= allocationUpperBound) {
                                                                                    setAllocationLowerBound(newMin);
                                                                                }
                                                                            }}
                                                                            min={0}
                                                                            max={100}
                                                                            className="w-full p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Max %</label>
                                                                        <input
                                                                            type="number"
                                                                            value={allocationUpperBound}
                                                                            onChange={(e) => {
                                                                                const newMax = Number(e.target.value);
                                                                                if (newMax >= 0 && newMax <= 100 && newMax >= allocationLowerBound) {
                                                                                    setAllocationUpperBound(newMax);
                                                                                }
                                                                            }}
                                                                            min={0}
                                                                            max={100}
                                                                            className="w-full p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="bg-white p-3 rounded border border-blue-200">
                                                                <p className="text-xs font-medium mb-2">{investmentPair.second.name}</p>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Min % (= 100 - Max %)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={secondAllocationLowerBound}
                                                                            disabled
                                                                            className="w-full p-1 border rounded-md bg-gray-100 border-gray-300 text-gray-600"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Max % (= 100 - Min %)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={secondAllocationUpperBound}
                                                                            disabled
                                                                            className="w-full p-1 border rounded-md bg-gray-100 border-gray-300 text-gray-600"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Step %</label>
                                                            <input
                                                                type="number"
                                                                value={allocationSteps}
                                                                onChange={(e) => {
                                                                    const newStep = Number(e.target.value);
                                                                    if (newStep > 0 && newStep <= 20) {
                                                                        setAllocationSteps(newStep);
                                                                    }
                                                                }}
                                                                min={1}
                                                                max={20}
                                                                className="w-1/3 p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900"
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            For each allocation value, {investmentPair.first.name} and {investmentPair.second.name} percentages will always sum to 100%.
                                                        </p>
                                                    </div>
                                                </div>
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

                    {/* Results section - Show charts if exploration results exist */}
                    {explorationResults && Object.keys(explorationResults).length > 0 && (
                        <div className="mt-10 space-y-6">
                            <h2 className="text-2xl font-semibold text-gray-900">Exploration Results</h2>

                            {/* Chart Controls */}
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm font-medium text-gray-700">Chart Type:</label>
                                    <select
                                        value={displayChart}
                                        onChange={(e) => setDisplayChart(e.target.value)}
                                        className="p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900"
                                    >
                                        <option value="timeSeries">Time Series</option>
                                        <option value="parameterValue">Parameter Function</option>
                                    </select>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <label className="text-sm font-medium text-gray-700">Metric:</label>
                                    <select
                                        value={selectedMetric}
                                        onChange={(e) => setSelectedMetric(e.target.value)}
                                        className="p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900"
                                    >
                                        <option value="probability">Probability of Success</option>
                                        <option value="medianInvestment">Median Total Investments</option>
                                    </select>
                                </div>
                            </div>

                            {/* Charts */}
                            {displayChart === 'timeSeries' ? (
                                <TimeSeriesChart results={explorationResults} />
                            ) : (
                                <ParameterValueChart results={explorationResults} />
                            )}
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