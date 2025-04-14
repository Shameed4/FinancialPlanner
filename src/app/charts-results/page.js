'use client'

import { useState } from 'react';
import { motion } from 'framer-motion';
import pageVariants from "../components/PageAnimation";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Simplified imports - just the components we need
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';

// The rest of your code remains the same...
// Sample data – replace these with your API calls as needed
const simulationResults = [
    {
        id: "sim1",
        title: "Sean's Retirement",
        date: "2023-09-15",
        summary: {
            number_of_runs: 1000,
            mean_final_value: 3792137.47,
            median_final_value: 3336871.69,
            percentile_10: 1669389.21,
            percentile_90: 6448786.62
        },
        history: [
            { year: 1, age: 66, total_assets: 969710.82, taxable: 474547.4, ira: 391924.11, roth: 103239.31, annual_income: 7500.0, annual_expenses: 37472.24, taxes_paid: 0.0 },
            { year: 2, age: 67, total_assets: 951522.91, taxable: 457633.97, ira: 414464.75, roth: 79424.19, annual_income: 7118.21, annual_expenses: 38673.87, taxes_paid: 0.0 },
            { year: 3, age: 68, total_assets: 882435.75, taxable: 378348.87, ira: 399468.19, roth: 104618.69, annual_income: 6864.51, annual_expenses: 40014.37, taxes_paid: 0.0 },
            { year: 4, age: 69, total_assets: 991349.15, taxable: 488679.51, ira: 414474.04, roth: 88195.6, annual_income: 5675.23, annual_expenses: 41875.07, taxes_paid: 0.0 },
            { year: 5, age: 70, total_assets: 1180730.0, taxable: 625950.58, ira: 457105.69, roth: 97673.74, annual_income: 7330.19, annual_expenses: 43264.87, taxes_paid: 0.0 },
            { year: 6, age: 71, total_assets: 1358919.9, taxable: 770978.49, ira: 496647.62, roth: 91293.79, annual_income: 9389.26, annual_expenses: 44884.8, taxes_paid: 0.0 },
            { year: 7, age: 72, total_assets: 1384899.43, taxable: 752304.91, ira: 530301.07, roth: 102293.45, annual_income: 11564.68, annual_expenses: 45712.91, taxes_paid: 0.0 },
            { year: 8, age: 73, total_assets: 1459221.98, taxable: 765013.49, ira: 597394.41, roth: 96814.08, annual_income: 11284.57, annual_expenses: 46397.97, taxes_paid: 0.0 },
            { year: 9, age: 74, total_assets: 1214788.22, taxable: 580680.5, ira: 562056.9, roth: 72050.82, annual_income: 23239.91, annual_expenses: 47381.4, taxes_paid: 633.91 },
            { year: 10, age: 75, total_assets: 1240477.18, taxable: 609088.06, ira: 561046.81, roth: 70342.31, annual_income: 20427.09, annual_expenses: 49317.26, taxes_paid: 320.09 }
        ]
    },
    // ...sim2, sim3 could be defined similarly
];

// Summary Card Component
const ResultCard = ({ result, onClick }) => (
    <div
        className="bg-white text-black rounded-xl shadow-md p-6 hover:shadow-lg transition-all cursor-pointer"
        onClick={onClick}
    >
        <h3 className="text-xl font-semibold mb-2 text-gray-900">{result.title}</h3>
        <p className="text-sm text-gray-500 mb-4">Run on: {result.date}</p>
        <div className="space-y-2">
            <div className="flex justify-between">
                <span className="text-gray-600">Number of Runs:</span>
                <span className="font-medium">{result.summary.number_of_runs.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Mean Final Value:</span>
                <span className="font-medium">${result.summary.mean_final_value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Median Final Value:</span>
                <span className="font-medium">${result.summary.median_final_value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">10th Percentile:</span>
                <span className="font-medium">${result.summary.percentile_10.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">90th Percentile:</span>
                <span className="font-medium">${result.summary.percentile_90.toLocaleString()}</span>
            </div>
        </div>
        <div className="mt-4 text-blue-600 text-sm font-medium flex items-center">
            View Details
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </div>
    </div>
);

// ===== Chart Components =====

// 1. Line Chart: Asset Growth Over Time
const AssetGrowthLineChart = ({ history }) => {
    // Prepare data arrays for the x-axis (years) and total assets series
    const xData = history.map(entry => entry.year);
    const totalAssetsData = history.map(entry => entry.total_assets);

    return (
        <div className="w-full h-64">
            <LineChart
                width={500}
                height={300}
                // Pass x-axis data – MUI X expects an array of objects; here we pass one object with the data property
                xAxis={[{ data: xData }]}
                series={[
                    { data: totalAssetsData, label: 'Total Assets' }
                ]}
            />
        </div>
    );
};

// 2. Bar Chart: Asset Allocation Breakdown Over Time
const AssetAllocationBarChart = ({ history }) => {
    // Prepare x-axis and series data
    // It's a good idea to convert the year to strings for a categorical axis
    const xData = history.map(entry => String(entry.year));
    const taxableData = history.map(entry => entry.taxable);
    const iraData = history.map(entry => entry.ira);
    const rothData = history.map(entry => entry.roth);

    return (
        <div className="w-full h-64">
            <BarChart
                width={600}
                height={300}
                series={[
                    { data: taxableData, label: 'Taxable', stack: 'total' },
                    { data: iraData, label: 'IRA', stack: 'total' },
                    { data: rothData, label: 'Roth', stack: 'total' },
                ]}
                xAxis={[{ type: 'band', data: xData }]}
            />
        </div>
    );
};


// 3. Pie Chart: Asset Allocation for Final Year
const AssetAllocationPieChart = ({ history }) => {
    const lastEntry = history[history.length - 1];
    const total = lastEntry.taxable + lastEntry.ira + lastEntry.roth;
    const pieData = [
        { id: 0, value: (lastEntry.taxable / total) * 100, label: 'Taxable' },
        { id: 1, value: (lastEntry.ira / total) * 100, label: 'IRA' },
        { id: 2, value: (lastEntry.roth / total) * 100, label: 'Roth' }
    ];

    return (
        <div className="w-full h-64">
            <PieChart
                width={400}
                height={200}
                series={[
                    { data: pieData }
                ]}
            />
        </div>
    );
};

// Detailed View Component including charts
const DetailedView = ({ result, onBack }) => {
    const [selectedQuantity, setSelectedQuantity] = useState('total_assets');
    const [barChartQuantity, setBarChartQuantity] = useState('investments');

    // Basic chart data from history
    const chartData = result.history.map(entry => ({
        year: entry.year,
        age: entry.age,
        total_assets: entry.total_assets,
        taxable: entry.taxable,
        ira: entry.ira,
        roth: entry.roth,
        annual_income: entry.annual_income,
        annual_expenses: entry.annual_expenses,
        taxes_paid: entry.taxes_paid
    }));

    // For probability of success chart (simulated data)
    const successProbabilityData = Array.from({ length: 10 }, (_, i) => ({
        year: i + 1,
        probability: Math.min(100, 50 + i * 5)  // Starts at 50%, increases by 5% each year
    }));

    // For the shaded area chart - create upper and lower bounds
    const createRangeData = () => {
        return chartData.map(entry => {
            // Base value for the selected metric
            const baseValue = entry[selectedQuantity];

            // Create upper/lower bound series for each percentile range
            return {
                year: entry.year,
                median: baseValue,
                // These are simulated - in reality they would be calculated from simulation data
                upper60: baseValue * 1.2,  // 60th percentile (20% above median)
                lower40: baseValue * 0.8,  // 40th percentile (20% below median)
                upper70: baseValue * 1.4,  // 70th percentile 
                lower30: baseValue * 0.6,  // 30th percentile
                upper80: baseValue * 1.6,  // 80th percentile
                lower20: baseValue * 0.4,  // 20th percentile
                upper90: baseValue * 1.8,  // 90th percentile
                lower10: baseValue * 0.2,  // 10th percentile
            };
        });
    };

    const rangeData = createRangeData();

    // Format dollar values
    const formatDollar = (value) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(0)}k`;
        }
        return `$${value.toFixed(0)}`;
    };

    // Get label for the selected quantity
    const getQuantityLabel = (quantityKey) => {
        const labels = {
            'total_assets': 'Total Investments',
            'annual_income': 'Total Income',
            'annual_expenses': 'Total Expenses',
            'taxes_paid': 'Early Withdrawal Tax'
        };
        return labels[quantityKey] || quantityKey;
    };

    return (
        <div className="bg-white text-black rounded-xl shadow-md p-6">
            {/* Header with back button and title */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Results
                </button>

                <h2 className="text-2xl font-bold text-gray-900">{result.title || "Simulation Results"}</h2>
                <div></div> {/* Empty div for spacing */}
            </div>

            {/* Summary Section */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Simulation Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Number of Runs</p>
                        <p className="text-xl font-medium">{result.summary.number_of_runs.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Mean Final Value</p>
                        <p className="text-xl font-medium">${result.summary.mean_final_value.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Median Final Value</p>
                        <p className="text-xl font-medium">${result.summary.median_final_value.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">10th Percentile</p>
                        <p className="text-xl font-medium">${result.summary.percentile_10.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">90th Percentile</p>
                        <p className="text-xl font-medium">${result.summary.percentile_90.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Detailed History Section - now above charts */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Yearly Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Assets</th>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxable</th>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IRA</th>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roth</th>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                                <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {result.history.map((entry, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-2 whitespace-nowrap">{entry.year}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{entry.age}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">${entry.total_assets.toLocaleString()}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">${entry.taxable.toLocaleString()}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">${entry.ira.toLocaleString()}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">${entry.roth.toLocaleString()}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">${entry.annual_income.toLocaleString()}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">${entry.annual_expenses.toLocaleString()}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">${entry.taxes_paid.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts Section */}
            <div className="mt-8 space-y-12">
                <h3 className="text-xl font-semibold mb-4">Simulation Results</h3>

                {/* Chart 4.1: Line chart of probability of success over time */}
                <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h4 className="text-lg font-medium mb-4">4.1 Probability of Success Over Time</h4>
                    <p className="text-sm text-gray-600 mb-4">
                        This chart shows the percentage of simulations in which the financial goal is satisfied in each year and all preceding years.
                    </p>
                    <div className="h-96">
                        <LineChart
                            xAxis={[{
                                data: successProbabilityData.map(item => item.year),
                                label: 'Year',
                                scaleType: 'linear',
                            }]}
                            yAxis={[{
                                label: 'Probability (%)',
                                min: 0,
                                max: 100
                            }]}
                            series={[
                                {
                                    data: successProbabilityData.map(item => item.probability),
                                    label: 'Success Probability',
                                    color: '#4CAF50'
                                }
                            ]}
                            height={350}
                            width={800}
                            margin={{ top: 20, right: 40, bottom: 50, left: 70 }}
                        />
                    </div>
                </div>

                {/* Chart 4.2: Shaded line chart with probability ranges */}
                <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-medium">4.2 Probability Ranges Over Time</h4>
                        <select
                            value={selectedQuantity}
                            onChange={(e) => setSelectedQuantity(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="total_assets">Total Investments</option>
                            <option value="annual_income">Total Income</option>
                            <option value="annual_expenses">Total Expenses</option>
                            <option value="taxes_paid">Early Withdrawal Tax</option>
                        </select>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        This chart shows the median value of {getQuantityLabel(selectedQuantity)} over time with shaded regions representing probability ranges.
                    </p>
                    <div className="h-96">
                        <LineChart
                            xAxis={[{
                                data: rangeData.map(item => item.year),
                                label: 'Year',
                                scaleType: 'linear',
                            }]}
                            yAxis={[{
                                label: `${getQuantityLabel(selectedQuantity)} ($)`,
                                tickFormatter: (value) => formatDollar(value)
                            }]}
                            series={[
                                // Median line
                                {
                                    data: rangeData.map(d => d.median),
                                    label: 'Median (50%)',
                                    color: '#2196f3',
                                },
                                // 40%-60% range
                                {
                                    data: rangeData.map(d => d.upper60),
                                    label: '60% Percentile',
                                    color: 'rgba(33, 150, 243, 0.3)',
                                    area: true,
                                    showMark: false,
                                },
                                {
                                    data: rangeData.map(d => d.lower40),
                                    label: '40% Percentile',
                                    color: 'rgba(33, 150, 243, 0.3)',
                                    area: true,
                                    showMark: false,
                                },
                                // 30%-70% range
                                {
                                    data: rangeData.map(d => d.upper70),
                                    label: '70% Percentile',
                                    color: 'rgba(33, 150, 243, 0.2)',
                                    area: true,
                                    showMark: false,
                                },
                                {
                                    data: rangeData.map(d => d.lower30),
                                    label: '30% Percentile',
                                    color: 'rgba(33, 150, 243, 0.2)',
                                    area: true,
                                    showMark: false,
                                },
                                // 20%-80% range
                                {
                                    data: rangeData.map(d => d.upper80),
                                    label: '80% Percentile',
                                    color: 'rgba(33, 150, 243, 0.1)',
                                    area: true,
                                    showMark: false,
                                },
                                {
                                    data: rangeData.map(d => d.lower20),
                                    label: '20% Percentile',
                                    color: 'rgba(33, 150, 243, 0.1)',
                                    area: true,
                                    showMark: false,
                                },
                                // 10%-90% range
                                {
                                    data: rangeData.map(d => d.upper90),
                                    label: '90% Percentile',
                                    color: 'rgba(33, 150, 243, 0.05)',
                                    area: true,
                                    showMark: false,
                                },
                                {
                                    data: rangeData.map(d => d.lower10),
                                    label: '10% Percentile',
                                    color: 'rgba(33, 150, 243, 0.05)',
                                    area: true,
                                    showMark: false,
                                },
                            ]}
                            height={350}
                            width={800}
                            margin={{ top: 20, right: 40, bottom: 50, left: 70 }}
                        />
                    </div>
                    {selectedQuantity === 'total_assets' && (
                        <div className="mt-4 text-sm text-gray-600">
                            <div className="flex items-center">
                                <div className="w-4 h-1 bg-red-500 mr-2"></div>
                                <span>Financial Goal Line (would be shown on the chart in a full implementation)</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chart 4.3: Stacked bar chart */}
                <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                        <h4 className="text-lg font-medium">4.3 Breakdown By Year</h4>
                        <div className="flex gap-4">
                            <select
                                value={barChartQuantity}
                                onChange={(e) => setBarChartQuantity(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="investments">Investments</option>
                                <option value="income">Income</option>
                                <option value="expenses">Expenses</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        This stacked bar chart shows the breakdown of {barChartQuantity} by year.
                    </p>
                    <div className="h-96">
                        {barChartQuantity === 'investments' && (
                            <BarChart
                                xAxis={[{
                                    scaleType: 'band',
                                    data: chartData.map(d => d.year),
                                    label: 'Year',
                                }]}
                                yAxis={[{
                                    label: 'Value ($)',
                                    tickFormatter: (value) => formatDollar(value)
                                }]}
                                series={[
                                    {
                                        data: chartData.map(d => d.taxable),
                                        label: 'Taxable',
                                        stack: 'total',
                                        color: '#4CAF50',
                                    },
                                    {
                                        data: chartData.map(d => d.ira),
                                        label: 'IRA',
                                        stack: 'total',
                                        color: '#2196F3',
                                    },
                                    {
                                        data: chartData.map(d => d.roth),
                                        label: 'Roth',
                                        stack: 'total',
                                        color: '#FFC107',
                                    }
                                ]}
                                height={350}
                                width={800}
                                margin={{ top: 20, right: 40, bottom: 50, left: 70 }}
                            />
                        )}

                        {barChartQuantity === 'income' && (
                            <BarChart
                                xAxis={[{
                                    scaleType: 'band',
                                    data: chartData.map(d => d.year),
                                    label: 'Year',
                                }]}
                                yAxis={[{
                                    label: 'Value ($)',
                                    tickFormatter: (value) => formatDollar(value)
                                }]}
                                series={[
                                    {
                                        data: chartData.map(d => d.annual_income),
                                        label: 'Income',
                                        color: '#4CAF50',
                                    }
                                ]}
                                height={350}
                                width={800}
                                margin={{ top: 20, right: 40, bottom: 50, left: 70 }}
                            />
                        )}

                        {barChartQuantity === 'expenses' && (
                            <BarChart
                                xAxis={[{
                                    scaleType: 'band',
                                    data: chartData.map(d => d.year),
                                    label: 'Year',
                                }]}
                                yAxis={[{
                                    label: 'Value ($)',
                                    tickFormatter: (value) => formatDollar(value)
                                }]}
                                series={[
                                    {
                                        data: chartData.map(d => d.annual_expenses),
                                        label: 'Expenses',
                                        stack: 'total',
                                        color: '#F44336',
                                    },
                                    {
                                        data: chartData.map(d => d.taxes_paid),
                                        label: 'Taxes',
                                        stack: 'total',
                                        color: '#9C27B0',
                                    }
                                ]}
                                height={350}
                                width={800}
                                margin={{ top: 20, right: 40, bottom: 50, left: 70 }}
                            />
                        )}
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                        <p>
                            {barChartQuantity === 'investments'
                                ? "Breakdown of total investments by account type."
                                : barChartQuantity === 'income'
                                    ? "Breakdown of income by source."
                                    : "Breakdown of expenses by category, including taxes."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChartsAndResultsPage = () => {
    const [selectedResult, setSelectedResult] = useState(null);
    const router = useRouter();

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8"
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Charts and Results</h1>
            </div>

            {selectedResult ? (
                <DetailedView result={selectedResult} onBack={() => setSelectedResult(null)} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {simulationResults.map((result) => (
                        <ResultCard key={result.id} result={result} onClick={() => setSelectedResult(result)} />
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default ChartsAndResultsPage;
