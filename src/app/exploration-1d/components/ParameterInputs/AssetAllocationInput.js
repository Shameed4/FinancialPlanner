import React from 'react';

const AssetAllocationInput = ({
    baseScenario,
    selectedAllocationEvent,
    setSelectedAllocationEvent,
    firstInvestmentName,
    setFirstInvestmentName,
    secondInvestmentName,
    setSecondInvestmentName,
    firstInvestmentPercent,
    setFirstInvestmentPercent,
    finalFirstInvestmentPercent,
    setFinalFirstInvestmentPercent,
    description
}) => {
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
                {description}
            </p>

            {eventSeries.length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700">
                        No eligible investment events found. This feature requires event series of type "invest" with exactly 2 investments in their allocations.
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
};

export default AssetAllocationInput; 