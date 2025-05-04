import React from 'react';

const RothConversionInput = ({
    paramValue,
    setParamValue,
    rothStartYear,
    setRothStartYear,
    rothEndYear,
    setRothEndYear
}) => {
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
};

export default RothConversionInput; 