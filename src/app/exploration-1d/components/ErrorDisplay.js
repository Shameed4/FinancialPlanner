import React from 'react';

const ErrorDisplay = ({ error, onDismiss }) => {
    if (!error) return null;

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <button
                onClick={onDismiss}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Dismiss
            </button>
        </div>
    );
};

export default ErrorDisplay; 