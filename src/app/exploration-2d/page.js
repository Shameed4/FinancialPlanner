'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import pageVariants from "../components/PageAnimation";
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LineChart } from '@mui/x-charts/LineChart';
import Script from 'next/script';

// Chart component for 2D visualization - direct Plotly implementation
const PlotlyChart = ({ plotType, xValues, yValues, zValues, parameterA, parameterB, metric }) => {
    const chartRef = useRef(null);
    const [isPlotlyLoaded, setIsPlotlyLoaded] = useState(false);
    const [error, setError] = useState(null);

    // Handle Plotly script loading
    const handlePlotlyLoad = () => {
        setIsPlotlyLoaded(true);
    };

    // Create the chart once Plotly is loaded
    useEffect(() => {
        if (!isPlotlyLoaded || !chartRef.current || !xValues || !yValues || !zValues) return;

        try {
            // Log the current metric for debugging
            console.log('Creating chart with metric:', metric);

            let plotData = [];
            let layout = {};

            // Common properties for both types
            const isInvestmentMetric = metric === 'finalMedianInvest';
            const title = isInvestmentMetric ? 'Median Investment' : 'Success Probability';
            const hoverTemplate =
                `${parameterA}: %{x}<br>` +
                `${parameterB}: %{y}<br>` +
                `${title}: %{z}` +
                (isInvestmentMetric ? '<extra></extra>' : '%<extra></extra>');

            if (plotType === 'surface') {
                plotData = [{
                    type: 'surface',
                    x: xValues,
                    y: yValues,
                    z: zValues,
                    colorscale: 'Viridis',
                    contours: {
                        z: {
                            show: true,
                            usecolormap: true,
                            highlightcolor: "#42f462",
                            project: { z: true }
                        }
                    },
                    hovertemplate: hoverTemplate
                }];

                layout = {
                    title: `${title} by Parameter Values`,
                    autosize: true,
                    scene: {
                        xaxis: { title: parameterA },
                        yaxis: { title: parameterB },
                        zaxis: {
                            title: title,
                            tickprefix: isInvestmentMetric ? '$' : '',
                            ticksuffix: !isInvestmentMetric ? '%' : ''
                        }
                    },
                    margin: { l: 0, r: 0, b: 0, t: 40 }
                };
            } else {
                // Contour plot
                plotData = [{
                    type: 'contour',
                    x: xValues,
                    y: yValues,
                    z: zValues,
                    colorscale: 'Viridis',
                    contours: {
                        coloring: 'heatmap',
                        showlabels: true,
                        labelfont: {
                            family: 'Raleway',
                            size: 12,
                            color: 'white',
                        }
                    },
                    hovertemplate: hoverTemplate
                }];

                layout = {
                    title: `${title} by Parameter Values`,
                    autosize: true,
                    xaxis: { title: parameterA },
                    yaxis: { title: parameterB },
                    margin: { l: 50, r: 50, b: 50, t: 50 }
                };
            }

            // Clear previous chart
            window.Plotly.purge(chartRef.current);

            // Create new chart
            window.Plotly.newPlot(chartRef.current, plotData, layout, { responsive: true });
        } catch (err) {
            console.error('Error creating chart:', err);
            setError(err.message);
        }

        // Cleanup on unmount
        return () => {
            if (chartRef.current && window.Plotly) {
                window.Plotly.purge(chartRef.current);
            }
        };
    }, [isPlotlyLoaded, plotType, xValues, yValues, zValues, parameterA, parameterB, metric]);

    if (error) {
        return (
            <div className="h-[500px] w-full flex items-center justify-center bg-red-50">
                <p className="text-red-600">Error loading visualization: {error}</p>
            </div>
        );
    }

    return (
        <>
            <Script
                src="https://cdn.plot.ly/plotly-2.29.1.min.js"
                onLoad={handlePlotlyLoad}
                strategy="afterInteractive"
            />
            {!isPlotlyLoaded && (
                <div className="h-[500px] w-full flex items-center justify-center bg-gray-100">
                    <p>Loading visualization library...</p>
                </div>
            )}
            <div
                ref={chartRef}
                className="h-[500px] w-full"
                style={{ display: isPlotlyLoaded ? 'block' : 'none' }}
            />
        </>
    );
};

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

    // New state for 2D visualization
    const [visualizationData, setVisualizationData] = useState(null);
    const [selectedMetric, setSelectedMetric] = useState('finalMedianInvest');
    const [showVisualization, setShowVisualization] = useState(false);
    const [plotType, setPlotType] = useState('surface'); // 'surface' or 'contour'

    // Event series selection state for Parameter A
    const [selectedEventSeriesIndexA, setSelectedEventSeriesIndexA] = useState(-1);
    const [selectedEventSeriesA, setSelectedEventSeriesA] = useState(null);
    const [eventSeriesModifyAttributeA, setEventSeriesModifyAttributeA] = useState('startYear'); // 'startYear' or 'duration'

    // Event series selection state for Parameter B
    const [selectedEventSeriesIndexB, setSelectedEventSeriesIndexB] = useState(-1);
    const [selectedEventSeriesB, setSelectedEventSeriesB] = useState(null);
    const [eventSeriesModifyAttributeB, setEventSeriesModifyAttributeB] = useState('startYear'); // 'startYear' or 'duration'

    // Allocation specific state for Parameter A
    const [selectedInvestEventA, setSelectedInvestEventA] = useState(null);
    const [investmentPairA, setInvestmentPairA] = useState(null); // {first: {name, percentage}, second: {name, percentage}}

    // Allocation specific state for Parameter B
    const [selectedInvestEventB, setSelectedInvestEventB] = useState(null);
    const [investmentPairB, setInvestmentPairB] = useState(null); // {first: {name, percentage}, second: {name, percentage}}

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

    // Function to update nested fields for parameter A
    const updateParameterAFields = (paramType) => {
        if (!selectedScenario || !selectedScenario.eventSeries) return;

        // Update the parameter range first
        const selectedParam = explorationParameters.find(p => p.id === paramType);
        if (selectedParam) {
            setParamARangeMin(selectedParam.min);
            setParamARangeMax(selectedParam.max);
            setParamARangeStep(selectedParam.step);
        }

        // Reset event series selection
        setSelectedEventSeriesA(null);
        setSelectedEventSeriesIndexA(-1);

        if (paramType === 'eventSeriesTiming' && selectedScenario.eventSeries.length > 0) {
            // For timing parameter, select first event series
            const eventSeries = selectedScenario.eventSeries[0];
            setSelectedEventSeriesA(eventSeries);
            setSelectedEventSeriesIndexA(0);

            // Check if we should keep the current attribute or default to startYear
            const attribute = eventSeriesModifyAttributeA || 'startYear';
            setEventSeriesModifyAttributeA(attribute);

            // Set bounds based on the selected attribute
            if (attribute === 'startYear') {
                const currentStartYear = eventSeries.startYear || new Date().getFullYear();
                setParamARangeMin(currentStartYear);
                setParamARangeMax(currentStartYear + 10);
                setParamARangeStep(1);
            } else if (attribute === 'duration') {
                const currentDuration = eventSeries.durationFixed || 10;
                setParamARangeMin(currentDuration);
                setParamARangeMax(currentDuration + 10);
                setParamARangeStep(1);
            }
        }
        else if (paramType === 'eventSeriesAmount') {
            // For amount parameter, find first income or expense event
            const incomeOrExpenseSeries = selectedScenario.eventSeries.find(
                es => es.type === 'income' || es.type === 'expense'
            );

            if (incomeOrExpenseSeries) {
                const index = selectedScenario.eventSeries.indexOf(incomeOrExpenseSeries);
                setSelectedEventSeriesA(incomeOrExpenseSeries);
                setSelectedEventSeriesIndexA(index);

                // Set bounds based on amount
                const currentAmount = incomeOrExpenseSeries.initialAmount || 0;
                setParamARangeMin(currentAmount);
                setParamARangeMax(currentAmount * 2);
                setParamARangeStep(Math.round(Math.max(1, currentAmount / 5)));
            }
        }
        else if (paramType === 'allocations') {
            // Reset investment event selections
            setSelectedInvestEventA(null);
            setInvestmentPairA(null);

            // Set default range
            setParamARangeMin(0);
            setParamARangeMax(100);
            setParamARangeStep(10);

            console.log('Parameter A set to allocations. Please select an investment event.');
        }
    };

    // Function to update nested fields for parameter B
    const updateParameterBFields = (paramType) => {
        if (!selectedScenario || !selectedScenario.eventSeries) return;

        // Update the parameter range first
        const selectedParam = explorationParameters.find(p => p.id === paramType);
        if (selectedParam) {
            setParamBRangeMin(selectedParam.min);
            setParamBRangeMax(selectedParam.max);
            setParamBRangeStep(selectedParam.step);
        }

        // Reset event series selection
        setSelectedEventSeriesB(null);
        setSelectedEventSeriesIndexB(-1);

        if (paramType === 'eventSeriesTiming' && selectedScenario.eventSeries.length > 0) {
            // For timing parameter, select first event series
            const eventSeries = selectedScenario.eventSeries[0];
            setSelectedEventSeriesB(eventSeries);
            setSelectedEventSeriesIndexB(0);

            // Check if we should keep the current attribute or default to startYear
            const attribute = eventSeriesModifyAttributeB || 'startYear';
            setEventSeriesModifyAttributeB(attribute);

            // Set bounds based on the selected attribute
            if (attribute === 'startYear') {
                const currentStartYear = eventSeries.startYear || new Date().getFullYear();
                setParamBRangeMin(currentStartYear);
                setParamBRangeMax(currentStartYear + 10);
                setParamBRangeStep(1);
            } else if (attribute === 'duration') {
                const currentDuration = eventSeries.durationFixed || 10;
                setParamBRangeMin(currentDuration);
                setParamBRangeMax(currentDuration + 10);
                setParamBRangeStep(1);
            }
        }
        else if (paramType === 'eventSeriesAmount') {
            // For amount parameter, find first income or expense event
            const incomeOrExpenseSeries = selectedScenario.eventSeries.find(
                es => es.type === 'income' || es.type === 'expense'
            );

            if (incomeOrExpenseSeries) {
                const index = selectedScenario.eventSeries.indexOf(incomeOrExpenseSeries);
                setSelectedEventSeriesB(incomeOrExpenseSeries);
                setSelectedEventSeriesIndexB(index);

                // Set bounds based on amount
                const currentAmount = incomeOrExpenseSeries.initialAmount || 0;
                setParamBRangeMin(currentAmount);
                setParamBRangeMax(currentAmount * 2);
                setParamBRangeStep(Math.round(Math.max(1, currentAmount / 5)));
            }
        }
        else if (paramType === 'allocations') {
            // Reset investment event selections
            setSelectedInvestEventB(null);
            setInvestmentPairB(null);

            // Set default range
            setParamBRangeMin(0);
            setParamBRangeMax(100);
            setParamBRangeStep(10);

            console.log('Parameter B set to allocations. Please select an investment event.');
        }
    };

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

    // New helper function to update visualization data with current metric
    const updateVisualizationData = (resultsData, metricToUse) => {
        if (!resultsData) return;

        console.log('Updating visualization with metric:', metricToUse);

        // Extract parameters
        const outerKey = Object.keys(resultsData)[0];
        if (!outerKey || !resultsData[outerKey]) {
            console.error('Invalid results data structure');
            return;
        }

        // Get parameter A values
        const parameterAValues = Object.keys(resultsData[outerKey]);
        if (!parameterAValues.length) return;

        // Get parameter B
        const innerKeys = Object.keys(resultsData[outerKey][parameterAValues[0]]);
        if (!innerKeys.length) return;
        const parameterB = innerKeys[0];

        // Get parameter B values
        const parameterBValues = Object.keys(resultsData[outerKey][parameterAValues[0]][parameterB]);
        if (!parameterBValues.length) return;

        // Create data arrays
        const xValues = parameterAValues.map(Number);
        const yValues = parameterBValues.map(Number);

        // Create z-value grid specifically for the requested metric
        const zValues = [];
        for (const aValue of parameterAValues) {
            const row = [];
            for (const bValue of parameterBValues) {
                const dataPoint = resultsData[outerKey][aValue][parameterB][bValue];
                // Use the specified metric, not the state variable
                const value = dataPoint[metricToUse] || 0;
                row.push(value);
            }
            zValues.push(row);
        }

        console.log(`Z-value range for ${metricToUse}:`,
            Math.min(...zValues.flat()), 'to',
            Math.max(...zValues.flat()));

        // Return the processed data
        return {
            x: xValues,
            y: yValues,
            z: zValues,
            parameterA: outerKey,
            parameterB,
            results: resultsData
        };
    };

    // Function to process exploration results for 3D visualization
    const processVisualizationData = (results) => {
        if (!results) return null;
        // Use the updateVisualizationData helper with the current selectedMetric
        return updateVisualizationData(results, selectedMetric);
    };

    // Format value for display based on the metric
    const formatMetricValue = (value, metric) => {
        if (metric === 'finalSuccessProb') {
            return `${value.toFixed(0)}%`;
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
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

        console.log(`Generating ${valuesA.length * valuesB.length} scenario combinations...`);

        // Create all combinations of scenarios
        valuesA.forEach((valueA, indexA) => {
            valuesB.forEach((valueB, indexB) => {
                // Create a deep copy of the scenario
                const modifiedScenario = JSON.parse(JSON.stringify(selectedScenario));

                // Modify parameter A based on its type and attribute
                if (parameterA === 'eventSeriesTiming') {
                    const attributeA = eventSeriesModifyAttributeA;
                    const eventIndexA = selectedEventSeriesIndexA;

                    if (eventIndexA !== -1 && eventIndexA < modifiedScenario.eventSeries.length) {
                        const targetEventA = modifiedScenario.eventSeries[eventIndexA];
                        if (attributeA === 'startYear') {
                            targetEventA.startYear = valueA;
                            targetEventA.startYearType = 'fixed';
                        } else if (attributeA === 'duration') {
                            targetEventA.durationFixed = valueA;
                            targetEventA.durationType = 'fixed';
                        }
                    }
                } else if (parameterA === 'eventSeriesAmount') {
                    const eventIndexA = selectedEventSeriesIndexA;

                    if (eventIndexA !== -1 && eventIndexA < modifiedScenario.eventSeries.length) {
                        const targetEventA = modifiedScenario.eventSeries[eventIndexA];
                        targetEventA.initialAmount = valueA;
                        targetEventA.amount = valueA;
                    }
                } else if (parameterA === 'allocations') {
                    // Use the selected invest event for Parameter A
                    if (selectedInvestEventA && investmentPairA) {
                        // Find the event in the modified scenario
                        const eventIndex = modifiedScenario.eventSeries.findIndex(
                            es => (es.title === selectedInvestEventA.title || es.name === selectedInvestEventA.name) && es.type === 'invest'
                        );

                        if (eventIndex !== -1) {
                            const event = modifiedScenario.eventSeries[eventIndex];

                            // Make sure initialAllocations exists
                            if (!event.initialAllocations) {
                                event.initialAllocations = {};
                            }

                            // Update the percentages
                            event.initialAllocations[investmentPairA.first.name] = valueA;
                            event.initialAllocations[investmentPairA.second.name] = 100 - valueA;

                            // Log the investment event and updated allocations
                            console.log(`Updated investment allocations for "${event.name}": ${investmentPairA.first.name}=${valueA}%, ${investmentPairA.second.name}=${100 - valueA}%`);
                        } else {
                            console.error(`Could not find investment event "${selectedInvestEventA.name || selectedInvestEventA.title}" with type="invest"`);
                        }
                    }
                }

                // Modify parameter B based on its type and attribute
                if (parameterB === 'eventSeriesTiming') {
                    const attributeB = eventSeriesModifyAttributeB;
                    const eventIndexB = selectedEventSeriesIndexB;

                    if (eventIndexB !== -1 && eventIndexB < modifiedScenario.eventSeries.length) {
                        const targetEventB = modifiedScenario.eventSeries[eventIndexB];
                        if (attributeB === 'startYear') {
                            targetEventB.startYear = valueB;
                            targetEventB.startYearType = 'fixed';
                        } else if (attributeB === 'duration') {
                            targetEventB.durationFixed = valueB;
                            targetEventB.durationType = 'fixed';
                        }
                    }
                } else if (parameterB === 'eventSeriesAmount') {
                    const eventIndexB = selectedEventSeriesIndexB;

                    if (eventIndexB !== -1 && eventIndexB < modifiedScenario.eventSeries.length) {
                        const targetEventB = modifiedScenario.eventSeries[eventIndexB];
                        targetEventB.initialAmount = valueB;
                        targetEventB.amount = valueB;
                    }
                } else if (parameterB === 'allocations') {
                    // Use the selected invest event for Parameter B
                    if (selectedInvestEventB && investmentPairB) {
                        // Find the event in the modified scenario
                        const eventIndex = modifiedScenario.eventSeries.findIndex(
                            es => (es.title === selectedInvestEventB.title || es.name === selectedInvestEventB.name) && es.type === 'invest'
                        );

                        if (eventIndex !== -1) {
                            const event = modifiedScenario.eventSeries[eventIndex];

                            // Make sure initialAllocations exists
                            if (!event.initialAllocations) {
                                event.initialAllocations = {};
                            }

                            // Update the percentages
                            event.initialAllocations[investmentPairB.first.name] = valueB;
                            event.initialAllocations[investmentPairB.second.name] = 100 - valueB;

                            // Log the investment event and updated allocations
                            console.log(`Updated investment allocations for "${event.name}": ${investmentPairB.first.name}=${valueB}%, ${investmentPairB.second.name}=${100 - valueB}%`);
                        } else {
                            console.error(`Could not find investment event "${selectedInvestEventB.name || selectedInvestEventB.title}" with type="invest"`);
                        }
                    }
                }

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
                } else if (parameterA === 'allocations' && selectedInvestEventA && investmentPairA) {
                    const investName = selectedInvestEventA?.name || selectedInvestEventA?.title || 'Investment';
                    paramADesc = `${investName} ${investmentPairA.first.name}=${valueA}%`;
                } else {
                    paramADesc = `${parameterA}=${valueA}`;
                }

                if (parameterB === 'eventSeriesTiming') {
                    const seriesName = selectedEventSeriesB?.name || selectedEventSeriesB?.title || 'Event';
                    const attribute = eventSeriesModifyAttributeB === 'startYear' ? 'StartYear' : 'Duration';
                    paramBDesc = `${seriesName} ${attribute}=${valueB}`;
                } else if (parameterB === 'eventSeriesAmount') {
                    const seriesName = selectedEventSeriesB?.name || selectedEventSeriesB?.title || 'Event';
                    paramBDesc = `${seriesName} Amount=${formatCurrency(valueB)}`;
                } else if (parameterB === 'allocations' && selectedInvestEventB && investmentPairB) {
                    const investName = selectedInvestEventB?.name || selectedInvestEventB?.title || 'Investment';
                    paramBDesc = `${investName} ${investmentPairB.first.name}=${valueB}%`;
                } else {
                    paramBDesc = `${parameterB}=${valueB}`;
                }

                modifiedScenario.name = `${selectedScenario.name} (${paramADesc}, ${paramBDesc})`;
                modifiedScenario.id = `${selectedScenario.id}-${indexA}-${indexB}`;

                // Add to scenarios array
                scenarios.push({
                    parameterValues: {
                        [parameterA]: valueA,
                        [parameterB]: valueB
                    },
                    scenario: modifiedScenario
                });

                // Log scenario details to console
                console.log(`Created scenario ${scenarios.length}: ${modifiedScenario.name}`);
            });
        });

        // Show feedback message
        setFeedbackMessage(`Generated ${scenarios.length} scenarios with all parameter combinations. Check console for details.`);

        // Store the exploration results in state for potential visualization later
        setExplorationResults({
            parameterA: {
                id: parameterA,
                values: valuesA
            },
            parameterB: {
                id: parameterB,
                values: valuesB
            },
            scenarios: scenarios.map((item, index) => ({
                index,
                paramA: item.parameterValues[parameterA],
                paramB: item.parameterValues[parameterB],
                name: item.scenario.name
            }))
        });

        // Send scenarios to backend
        setIsProcessing(true);
        setFeedbackMessage(`Sending ${scenarios.length} scenarios to backend for processing...`);

        // Prepare data for backend
        const requestData = {
            scenarios: scenarios,
            simulationCount: simulationCount,
            userName: session.user.name,
        };

        // Call the API endpoint
        fetch('/api/explore-2d', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        })
            .then(response => response.json())
            .then(data => {
                setIsProcessing(false);

                if (data.success) {
                    setFeedbackMessage(`Success: ${data.message}`);
                    console.log('Backend response:', data);

                    // If we have visualization results, process them
                    if (data.results) {
                        console.log('Processing visualization data from results');
                        try {
                            // Store the raw results first
                            setExplorationResults(data.results);

                            // Then process it for visualization
                            const visData = processVisualizationData(data.results);
                            if (visData) {
                                setVisualizationData(visData);
                                setShowVisualization(true);
                            } else {
                                console.error('Could not process visualization data');
                                setFeedbackMessage(prev => prev + ' Could not process visualization data.');
                            }
                        } catch (error) {
                            console.error('Error processing visualization data:', error);
                            setFeedbackMessage(prev => prev + ' Error processing results for visualization.');
                        }
                    }
                } else {
                    setFeedbackMessage(`Error: ${data.error || 'Unknown error occurred'}`);
                    console.error('Backend error:', data);
                }
            })
            .catch(error => {
                setIsProcessing(false);
                setFeedbackMessage(`Error: ${error.message}`);
                console.error('Network error:', error);
            });

        console.log(`Exploring with parameter A: ${parameterA}, range: ${paramARangeMin} to ${paramARangeMax}, steps: ${paramARangeStep}`);
        console.log(`Exploring with parameter B: ${parameterB}, range: ${paramBRangeMin} to ${paramBRangeMax}, steps: ${paramBRangeStep}`);

        if (parameterA === 'allocations' && selectedInvestEventA) {
            console.log(`Allocation parameter A: Modifying ${investmentPairA.first.name} and ${investmentPairA.second.name} in ${selectedInvestEventA.title || selectedInvestEventA.name}`);
        }

        if (parameterB === 'allocations' && selectedInvestEventB) {
            console.log(`Allocation parameter B: Modifying ${investmentPairB.first.name} and ${investmentPairB.second.name} in ${selectedInvestEventB.title || selectedInvestEventB.name}`);
        }

        console.log(`Generated ${scenarios.length} scenarios for exploration.`);
    };

    // Handle automatic parameter changes when both are the same
    useEffect(() => {
        if (parameterA === parameterB && selectedScenario) {
            // Find the next available parameter type
            const nextType = explorationParameters.find(p => p.id !== parameterA)?.id;
            if (nextType) {
                console.log(`Both parameters are ${parameterA}, changing parameter B to ${nextType}`);
                setParameterB(nextType);
                // Update nested fields for parameter B
                updateParameterBFields(nextType);
            }
        }
    }, [parameterA, parameterB, selectedScenario]);

    // Initial setup of fields when scenario is selected
    useEffect(() => {
        if (selectedScenario) {
            updateParameterAFields(parameterA);
            updateParameterBFields(parameterB);
        }
    }, [selectedScenario]);

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
                                                onChange={(e) => {
                                                    setParameterA(e.target.value);
                                                    updateParameterAFields(e.target.value);
                                                }}
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
                                                        if (!e.target.value) return; // Handle empty selection
                                                        const index = parseInt(e.target.value);
                                                        const series = selectedScenario.eventSeries[index];
                                                        setSelectedEventSeriesA(series);
                                                        setSelectedEventSeriesIndexA(index);

                                                        // Update bounds based on the selected event series
                                                        if (parameterA === 'eventSeriesTiming') {
                                                            // Keep the current attribute (startYear or duration)
                                                            if (eventSeriesModifyAttributeA === 'startYear') {
                                                                const currentStartYear = series.startYear || new Date().getFullYear();
                                                                setParamARangeMin(currentStartYear);
                                                                setParamARangeMax(currentStartYear + 10);
                                                                setParamARangeStep(1);
                                                            } else if (eventSeriesModifyAttributeA === 'duration') {
                                                                const currentDuration = series.durationFixed || 10;
                                                                setParamARangeMin(currentDuration);
                                                                setParamARangeMax(currentDuration + 10);
                                                                setParamARangeStep(1);
                                                            }
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
                                                        .filter(eventSeries => {
                                                            // For timing parameter, show all event series
                                                            if (parameterA === 'eventSeriesTiming') {
                                                                return true;
                                                            }

                                                            // For amount parameter, only show income or expense types
                                                            if (parameterA === 'eventSeriesAmount') {
                                                                return eventSeries.type === 'income' || eventSeries.type === 'expense';
                                                            }

                                                            return true;
                                                        })
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

                                        {/* Allocation selection for Parameter A */}
                                        {parameterA === 'allocations' && (
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Investment Event for Parameter A
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

                                                            setSelectedInvestEventA(selectedEvent);
                                                            console.log(`Selected investment event for Parameter A: "${selectedEvent.name}" (type: ${selectedEvent.type})`);

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

                                                            setInvestmentPairA({ first: firstInvestment, second: secondInvestment });

                                                            // Set default allocation range based on current allocation
                                                            const currentPercentage = firstInvestment.percentage;
                                                            // Provide a reasonable range for exploration
                                                            const minValue = Math.max(0, Math.round(currentPercentage - 30));
                                                            const maxValue = Math.min(100, Math.round(currentPercentage + 30));

                                                            setParamARangeMin(minValue);
                                                            setParamARangeMax(maxValue);
                                                            setParamARangeStep(10);
                                                        }
                                                    }}
                                                >
                                                    <option value="">-- Select Investment Event --</option>
                                                    {selectedScenario.eventSeries
                                                        .filter(es => es.type === 'invest' && es.initialAllocations && Object.keys(es.initialAllocations).length >= 2)
                                                        .map((event, index) => (
                                                            <option key={index} value={index}>
                                                                {event.name || event.title || `Investment ${index + 1}`}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        )}

                                        {/* Allocation details for Parameter A */}
                                        {parameterA === 'allocations' && selectedInvestEventA && investmentPairA && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-md">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Allocation Details (Parameter A)</h4>
                                                <div className="space-y-2">
                                                    <p className="text-xs text-gray-600">
                                                        Investment: <span className="font-semibold">{selectedInvestEventA.title || selectedInvestEventA.name}</span>
                                                    </p>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="bg-white p-3 rounded border border-blue-200">
                                                            <p className="text-xs font-medium mb-2">{investmentPairA.first.name}</p>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">Min %</label>
                                                                    <input
                                                                        type="number"
                                                                        value={paramARangeMin}
                                                                        onChange={(e) => {
                                                                            const newMin = Number(e.target.value);
                                                                            if (newMin >= 0 && newMin <= 100 && newMin <= paramARangeMax) {
                                                                                setParamARangeMin(newMin);
                                                                                // No need to update other values as the second investment's
                                                                                // max is calculated as 100 - min
                                                                            }
                                                                        }}
                                                                        min={0}
                                                                        max={100}
                                                                        className="w-full p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">Max %</label>
                                                                    <input
                                                                        type="number"
                                                                        value={paramARangeMax}
                                                                        onChange={(e) => {
                                                                            const newMax = Number(e.target.value);
                                                                            if (newMax >= 0 && newMax <= 100) {
                                                                                setParamARangeMax(newMax);
                                                                                // No need to update other values as the second investment's
                                                                                // min is calculated as 100 - max
                                                                            }
                                                                        }}
                                                                        min={0}
                                                                        max={100}
                                                                        className="w-full p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-3 rounded border border-blue-200">
                                                            <p className="text-xs font-medium mb-2">{investmentPairA.second.name}</p>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">Min % (= 100 - {investmentPairA.first.name} Min %)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={100 - paramARangeMin}
                                                                        disabled
                                                                        className="w-full p-1 border rounded-md bg-gray-100 border-gray-300 text-gray-600"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">Max % (= 100 - {investmentPairA.first.name} Max %)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={100 - paramARangeMax}
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
                                                            value={paramARangeStep}
                                                            onChange={(e) => setParamARangeStep(Number(e.target.value))}
                                                            min={1}
                                                            max={20}
                                                            className="w-1/3 p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        For each allocation value, {investmentPairA.first.name} and {investmentPairA.second.name} percentages will always sum to 100%.
                                                    </p>
                                                </div>
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
                                        <div className={parameterA === 'allocations' ? 'hidden' : ''}>
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
                                                onChange={(e) => {
                                                    setParameterB(e.target.value);
                                                    updateParameterBFields(e.target.value);
                                                }}
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
                                                        if (!e.target.value) return; // Handle empty selection
                                                        const index = parseInt(e.target.value);
                                                        const series = selectedScenario.eventSeries[index];
                                                        setSelectedEventSeriesB(series);
                                                        setSelectedEventSeriesIndexB(index);

                                                        // Update bounds based on the selected event series
                                                        if (parameterB === 'eventSeriesTiming') {
                                                            // Keep the current attribute (startYear or duration)
                                                            if (eventSeriesModifyAttributeB === 'startYear') {
                                                                const currentStartYear = series.startYear || new Date().getFullYear();
                                                                setParamBRangeMin(currentStartYear);
                                                                setParamBRangeMax(currentStartYear + 10);
                                                                setParamBRangeStep(1);
                                                            } else if (eventSeriesModifyAttributeB === 'duration') {
                                                                const currentDuration = series.durationFixed || 10;
                                                                setParamBRangeMin(currentDuration);
                                                                setParamBRangeMax(currentDuration + 10);
                                                                setParamBRangeStep(1);
                                                            }
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
                                                        .filter(eventSeries => {
                                                            // For timing parameter, show all event series
                                                            if (parameterB === 'eventSeriesTiming') {
                                                                return true;
                                                            }

                                                            // For amount parameter, only show income or expense types
                                                            if (parameterB === 'eventSeriesAmount') {
                                                                return eventSeries.type === 'income' || eventSeries.type === 'expense';
                                                            }

                                                            return true;
                                                        })
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

                                        {/* Allocation selection for Parameter B */}
                                        {parameterB === 'allocations' && (
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Investment Event for Parameter B
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

                                                            setSelectedInvestEventB(selectedEvent);
                                                            console.log(`Selected investment event for Parameter B: "${selectedEvent.name}" (type: ${selectedEvent.type})`);

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

                                                            setInvestmentPairB({ first: firstInvestment, second: secondInvestment });

                                                            // Set default allocation range based on current allocation
                                                            const currentPercentage = firstInvestment.percentage;
                                                            // Provide a reasonable range for exploration
                                                            const minValue = Math.max(0, Math.round(currentPercentage - 30));
                                                            const maxValue = Math.min(100, Math.round(currentPercentage + 30));

                                                            setParamBRangeMin(minValue);
                                                            setParamBRangeMax(maxValue);
                                                            setParamBRangeStep(10);
                                                        }
                                                    }}
                                                >
                                                    <option value="">-- Select Investment Event --</option>
                                                    {selectedScenario.eventSeries
                                                        .filter(es => es.type === 'invest' && es.initialAllocations && Object.keys(es.initialAllocations).length >= 2)
                                                        .map((event, index) => (
                                                            <option key={index} value={index}>
                                                                {event.name || event.title || `Investment ${index + 1}`}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        )}

                                        {/* Allocation details for Parameter B */}
                                        {parameterB === 'allocations' && selectedInvestEventB && investmentPairB && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-md">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Allocation Details (Parameter B)</h4>
                                                <div className="space-y-2">
                                                    <p className="text-xs text-gray-600">
                                                        Investment: <span className="font-semibold">{selectedInvestEventB.title || selectedInvestEventB.name}</span>
                                                    </p>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="bg-white p-3 rounded border border-green-200">
                                                            <p className="text-xs font-medium mb-2">{investmentPairB.first.name}</p>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">Min %</label>
                                                                    <input
                                                                        type="number"
                                                                        value={paramBRangeMin}
                                                                        onChange={(e) => {
                                                                            const newMin = Number(e.target.value);
                                                                            if (newMin >= 0 && newMin <= 100 && newMin <= paramBRangeMax) {
                                                                                setParamBRangeMin(newMin);
                                                                                // No need to update other values as the second investment's
                                                                                // max is calculated as 100 - min
                                                                            }
                                                                        }}
                                                                        min={0}
                                                                        max={100}
                                                                        className="w-full p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">Max %</label>
                                                                    <input
                                                                        type="number"
                                                                        value={paramBRangeMax}
                                                                        onChange={(e) => {
                                                                            const newMax = Number(e.target.value);
                                                                            if (newMax >= 0 && newMax <= 100) {
                                                                                setParamBRangeMax(newMax);
                                                                                // No need to update other values as the second investment's
                                                                                // min is calculated as 100 - max
                                                                            }
                                                                        }}
                                                                        min={0}
                                                                        max={100}
                                                                        className="w-full p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-3 rounded border border-green-200">
                                                            <p className="text-xs font-medium mb-2">{investmentPairB.second.name}</p>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">Min % (= 100 - {investmentPairB.first.name} Min %)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={100 - paramBRangeMin}
                                                                        disabled
                                                                        className="w-full p-1 border rounded-md bg-gray-100 border-gray-300 text-gray-600"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">Max % (= 100 - {investmentPairB.first.name} Max %)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={100 - paramBRangeMax}
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
                                                            value={paramBRangeStep}
                                                            onChange={(e) => setParamBRangeStep(Number(e.target.value))}
                                                            min={1}
                                                            max={20}
                                                            className="w-1/3 p-1 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        For each allocation value, {investmentPairB.first.name} and {investmentPairB.second.name} percentages will always sum to 100%.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Start Year or Duration selection for Parameter B */}
                                        {parameterB === 'eventSeriesTiming' && selectedEventSeriesB && (
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Select Attribute to Modify
                                                </label>
                                                <select
                                                    value={eventSeriesModifyAttributeB}
                                                    onChange={(e) => {
                                                        setEventSeriesModifyAttributeB(e.target.value);
                                                        // Update ranges based on the selected attribute
                                                        if (e.target.value === 'startYear') {
                                                            const currentStartYear = selectedEventSeriesB.startYear || new Date().getFullYear();
                                                            setParamBRangeMin(currentStartYear);
                                                            setParamBRangeMax(currentStartYear + 10);
                                                        } else if (e.target.value === 'duration') {
                                                            const currentDuration = selectedEventSeriesB.durationFixed || 10;
                                                            setParamBRangeMin(currentDuration);
                                                            setParamBRangeMax(currentDuration + 10);
                                                        }
                                                    }}
                                                    className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="startYear">Start Year</option>
                                                    <option value="duration">Duration</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Parameter B range */}
                                        <div className={parameterB === 'allocations' ? 'hidden' : ''}>
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
                                <div className="text-black p-4 border border-gray-200 rounded-lg bg-gray-50">
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

                    {/* 2D Visualization Section */}
                    {showVisualization && visualizationData && (
                        <div className="mt-10">
                            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Exploration Visualization</h2>

                            <div className="text-black flex flex-col md:flex-row gap-6 mb-6">
                                <div className="flex-1 p-4 bg-white rounded-lg shadow">
                                    <div className="mb-4 flex justify-between items-center">
                                        <h3 className="text-lg font-medium">2D Parameter Visualization</h3>
                                        <div className="flex space-x-4">
                                            <select
                                                value={selectedMetric}
                                                onChange={(e) => {
                                                    const newMetric = e.target.value;
                                                    console.log('Changing metric from', selectedMetric, 'to', newMetric);

                                                    // Update the metric state
                                                    setSelectedMetric(newMetric);

                                                    // Reprocess data with new metric
                                                    if (visualizationData && visualizationData.results) {
                                                        try {
                                                            // Process directly with the new metric
                                                            const newVisData = updateVisualizationData(
                                                                visualizationData.results,
                                                                newMetric
                                                            );

                                                            if (newVisData) {
                                                                console.log('Updated visualization data with new metric:', newMetric);
                                                                setVisualizationData(newVisData);
                                                            }
                                                        } catch (error) {
                                                            console.error('Error updating visualization metric:', error);
                                                        }
                                                    }
                                                }}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm"
                                            >
                                                <option value="finalMedianInvest">Median Investment</option>
                                                <option value="finalSuccessProb">Success Probability</option>
                                            </select>
                                            <select
                                                value={plotType}
                                                onChange={(e) => setPlotType(e.target.value)}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm"
                                            >
                                                <option value="surface">Surface Plot</option>
                                                <option value="contour">Contour Plot</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="h-[500px] w-full">
                                        {!visualizationData ? (
                                            <div className="h-full w-full flex items-center justify-center bg-gray-100">
                                                <p>No visualization data available</p>
                                            </div>
                                        ) : (
                                            <PlotlyChart
                                                plotType={plotType}
                                                xValues={visualizationData.x}
                                                yValues={visualizationData.y}
                                                zValues={visualizationData.z}
                                                parameterA={visualizationData.parameterA}
                                                parameterB={visualizationData.parameterB}
                                                metric={selectedMetric}
                                            />
                                        )}
                                    </div>

                                    <div className="mt-4 text-sm text-gray-600">
                                        <p>This visualization shows how {selectedMetric === 'finalMedianInvest' ? 'median investment value' : 'success probability'}
                                            varies across different combinations of {visualizationData.parameterA} and {visualizationData.parameterB}.</p>
                                    </div>
                                </div>
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
