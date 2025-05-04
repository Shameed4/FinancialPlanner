import React, { useState } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';

// Helper function to format dollar amounts
function formatDollar(v) {
    if (v === undefined || v === null) return '$0';
    return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M`
        : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}k`
            : `$${v.toFixed(0)}`;
}

const ApiResultDisplay = ({ apiResponse, onClear }) => {
    if (!apiResponse) return null;

    const [selectedMetric, setSelectedMetric] = useState('successProb');
    const [selectedFinalMetric, setSelectedFinalMetric] = useState('successProb');

    // Extract the time series data from the API response
    const baselineSuccessProb = apiResponse.results?.baseline?.successProbTimeSeries || [];
    const modifiedSuccessProb = apiResponse.results?.modified?.successProbTimeSeries || [];
    const baselineMedianInvest = apiResponse.results?.baseline?.medianInvestTimeSeries || [];
    const modifiedMedianInvest = apiResponse.results?.modified?.medianInvestTimeSeries || [];

    // Prepare data for Chart 5.1 (Multi-line chart over time)
    const timeSeriesData = selectedMetric === 'successProb'
        ? {
            xAxis: baselineSuccessProb.map(d => d.year),
            baselineValues: baselineSuccessProb.map(d => d.probability),
            modifiedValues: modifiedSuccessProb.map(d => d.probability),
            yLabel: 'Probability (%)',
            formatter: (v) => `${v}%`
        }
        : {
            xAxis: baselineMedianInvest.map(d => d.year),
            baselineValues: baselineMedianInvest.map(d => d.medianInvestment),
            modifiedValues: modifiedMedianInvest.map(d => d.medianInvestment),
            yLabel: 'Median Investment',
            formatter: formatDollar
        };

    // Prepare data for Chart 5.2 (Final values comparison)
    const finalValuesData = selectedFinalMetric === 'successProb'
        ? {
            // X-axis: just labels for baseline and modified
            labels: ['Baseline', 'Modified'],
            // Y-axis: final values
            values: [
                apiResponse.results.baseline.finalSuccessProb,
                apiResponse.results.modified.finalSuccessProb
            ],
            yLabel: 'Final Success Probability (%)',
            formatter: (v) => `${v}%`
        }
        : {
            // X-axis: just labels for baseline and modified
            labels: ['Baseline', 'Modified'],
            // Y-axis: final values
            values: [
                apiResponse.results.baseline.finalMedianInvest,
                apiResponse.results.modified.finalMedianInvest
            ],
            yLabel: 'Final Median Investment',
            formatter: formatDollar
        };

    return (
        <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Exploration Results</h2>
                <button
                    onClick={onClear}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Clear Results
                </button>
            </div>

            <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="font-medium">Parameter: {apiResponse.parameterInfo.name}</p>
                    <p className="text-gray-700">
                        Value: {apiResponse.parameterInfo.value}
                        {apiResponse.parameterInfo.type === 'boolean' &&
                            ` (${apiResponse.parameterInfo.value === 1 ? 'Enabled' : 'Disabled'})`}
                    </p>
                </div>
            </div>

            {/* Chart 5.1: Multi-line chart over time */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">5.1 Metric Comparison Over Time</h3>
                    <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="metric"
                                value="successProb"
                                checked={selectedMetric === 'successProb'}
                                onChange={() => setSelectedMetric('successProb')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>Success Probability</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="metric"
                                value="medianInvest"
                                checked={selectedMetric === 'medianInvest'}
                                onChange={() => setSelectedMetric('medianInvest')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>Median Investment</span>
                        </label>
                    </div>
                </div>

                <div className="bg-white border p-4 rounded-lg">
                    <LineChart
                        xAxis={[{
                            data: timeSeriesData.xAxis,
                            label: 'Year'
                        }]}
                        yAxis={[{
                            label: timeSeriesData.yLabel,
                            tickFormatter: timeSeriesData.formatter
                        }]}
                        series={[
                            {
                                data: timeSeriesData.baselineValues,
                                label: 'Baseline',
                                color: '#2196f3',
                            },
                            {
                                data: timeSeriesData.modifiedValues,
                                label: 'Modified',
                                color: '#f44336',
                            }
                        ]}
                        height={350}
                        margin={{ left: 70 }}
                    />
                </div>
            </div>

            {/* Chart 5.2: Line chart showing final values */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">5.2 Final Values Comparison</h3>
                    <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="finalMetric"
                                value="successProb"
                                checked={selectedFinalMetric === 'successProb'}
                                onChange={() => setSelectedFinalMetric('successProb')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>Success Probability</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="finalMetric"
                                value="medianInvest"
                                checked={selectedFinalMetric === 'medianInvest'}
                                onChange={() => setSelectedFinalMetric('medianInvest')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span>Median Investment</span>
                        </label>
                    </div>
                </div>

                <div className="bg-white border p-4 rounded-lg">
                    <LineChart
                        xAxis={[{
                            data: finalValuesData.labels,
                            scaleType: 'band',
                        }]}
                        yAxis={[{
                            label: finalValuesData.yLabel,
                            tickFormatter: finalValuesData.formatter
                        }]}
                        series={[
                            {
                                data: finalValuesData.values,
                                label: finalValuesData.yLabel,
                                color: '#2196f3',
                                showMark: true,
                            }
                        ]}
                        height={300}
                        margin={{ left: 70 }}
                    />
                </div>
            </div>

            {/* Summary of Final Values */}
            <div className="mb-4">
                <h3 className="font-semibold mb-2">Final Values Summary</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium mb-1">Success Probability</h4>
                        <div className="flex justify-between">
                            <div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-blue-500 mr-2 rounded-sm"></div>
                                    <span className="text-gray-700">Baseline:</span>
                                </div>
                                <div className="text-xl font-bold">{apiResponse.results.baseline.finalSuccessProb}%</div>
                            </div>
                            <div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-red-500 mr-2 rounded-sm"></div>
                                    <span className="text-gray-700">Modified:</span>
                                </div>
                                <div className="text-xl font-bold">{apiResponse.results.modified.finalSuccessProb}%</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium mb-1">Final Median Investment</h4>
                        <div className="flex justify-between">
                            <div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-blue-500 mr-2 rounded-sm"></div>
                                    <span className="text-gray-700">Baseline:</span>
                                </div>
                                <div className="text-xl font-bold">{formatDollar(apiResponse.results.baseline.finalMedianInvest)}</div>
                            </div>
                            <div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-red-500 mr-2 rounded-sm"></div>
                                    <span className="text-gray-700">Modified:</span>
                                </div>
                                <div className="text-xl font-bold">{formatDollar(apiResponse.results.modified.finalMedianInvest)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiResultDisplay; 