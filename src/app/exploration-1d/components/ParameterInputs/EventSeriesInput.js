import React from 'react';

const EventSeriesInput = ({
    baseScenario,
    selectedEventSeries,
    setSelectedEventSeries,
    selectedEventProperty,
    setSelectedEventProperty,
    eventSeriesNewValue,
    setEventSeriesNewValue,
    description
}) => {
    // Get all event series from the base scenario
    const eventSeries = baseScenario?.eventSeries || [];

    return (
        <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 mb-4">
                {description}
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
};

export default EventSeriesInput; 