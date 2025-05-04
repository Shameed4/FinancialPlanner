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
];

export default PARAMETER_TYPES; 