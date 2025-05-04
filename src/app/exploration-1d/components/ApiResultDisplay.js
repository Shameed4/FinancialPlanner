import React from 'react';

const ApiResultDisplay = ({ apiResponse, onClear }) => {
    if (!apiResponse) return null;

    return (
        <div className="bg-white rounded-xl shadow p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Exploration Results</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap text-gray-700">
                    {JSON.stringify(apiResponse, null, 2)}
                </pre>
            </div>
            <button
                onClick={onClear}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Clear Results
            </button>
        </div>
    );
};

export default ApiResultDisplay; 