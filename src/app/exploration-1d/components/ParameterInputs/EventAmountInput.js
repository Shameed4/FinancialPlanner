import React from 'react';

const EventAmountInput = ({
    baseScenario,
    selectedAmountEventSeries,
    setSelectedAmountEventSeries,
    newInitialAmount,
    setNewInitialAmount,
    description
}) => {
    // Get all income and expense event series from the base scenario
    const eventSeries = baseScenario?.eventSeries?.filter(
        series => series.type === 'income' || series.type === 'expense'
    ) || [];

    return (
        <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 mb-4">
                {description}
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
};

export default EventAmountInput; 