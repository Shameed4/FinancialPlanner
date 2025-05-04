import React from 'react';

const GenericInput = ({
    selectedParameter,
    paramValue,
    setParamValue,
    paramRangeMin,
    paramRangeMax,
    paramStep
}) => {
    // For boolean parameters, show radio buttons
    if (selectedParameter.type === 'boolean') {
        return (
            <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-4">
                    This is a boolean parameter with two possible values:
                </p>
                <div className="flex space-x-4">
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
            </div>
        );
    }

    // Default numeric parameter UI
    return (
        <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Parameter Value
            </label>
            <input
                type="number"
                value={paramValue}
                onChange={(e) => setParamValue(Number(e.target.value))}
                min={paramRangeMin}
                max={paramRangeMax}
                step={paramStep}
                className="w-full p-2 border rounded-md bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Min: {paramRangeMin}{selectedParameter.unit}</span>
                <span>Max: {paramRangeMax}{selectedParameter.unit}</span>
                <span>Step: {paramStep}{selectedParameter.unit}</span>
            </div>
        </div>
    );
};

export default GenericInput; 