import React, { useEffect, useState } from 'react';

const ScenarioEventSeriesEditorModal = () => {
    const [eventSeries, setEventSeries] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [changeType, setChangeType] = useState('fixed');
    const [fixedValue, setFixedValue] = useState(0);
    const [uniformLower, setUniformLower] = useState(0);
    const [uniformUpper, setUniformUpper] = useState(0);
    const [normalMean, setNormalMean] = useState(0);
    const [normalStdev, setNormalStdev] = useState(0);
    const [rateAmt, setRateAmt] = useState('percent');
    const [inflationAdjusted, setInflationAdjusted] = useState(false);
    const [userPercentage, setUserPercentage] = useState(100);
    const [isDiscretionary, setIsDiscretionary] = useState(false);
    const [spendingStrategy, setSpendingStrategy] = useState('Fixed');

    useEffect(() => {
        // When the event series changes, initialize local state
        if (eventSeries) {
            console.log("Loading event series:", eventSeries);
            setName(eventSeries.name || '');
            setDescription(eventSeries.description || '');

            // Ensure we always have a valid changeType with default to 'fixed'
            const changeType = eventSeries.changeType || 'fixed';
            setChangeType(changeType);

            // Initialize distribution values, ensuring 0 values are properly set
            if (changeType === 'fixed') {
                // Handle both direct changeDistribution.value and annualChange
                // Use nullish coalescing to properly handle 0 values
                const fixedValue = eventSeries.changeDistribution?.value !== undefined ?
                    eventSeries.changeDistribution.value :
                    (eventSeries.annualChange !== undefined ? eventSeries.annualChange : 0);

                console.log(`Setting fixed value: ${fixedValue}`);
                setFixedValue(fixedValue);
            } else if (changeType === 'uniform') {
                // Ensure lower and upper are set even if they're 0
                setUniformLower(eventSeries.changeDistribution?.lower ?? eventSeries.annualChangeMin ?? 0);
                setUniformUpper(eventSeries.changeDistribution?.upper ?? eventSeries.annualChangeMax ?? 0);
            } else if (changeType === 'normal') {
                // Ensure mean and stdev are set even if they're 0
                setNormalMean(eventSeries.changeDistribution?.mean ?? eventSeries.annualChangeMean ?? 0);
                setNormalStdev(eventSeries.changeDistribution?.stdev ?? eventSeries.annualChangeStd ?? 0);
            }

            // Other fields
            setRateAmt(eventSeries.changeAmtOrPct || 'percent');
            setInflationAdjusted(eventSeries.inflationAdjusted || false);
            setUserPercentage(eventSeries.userPercentage || 100);

            if (eventSeries.type === 'expense') {
                setIsDiscretionary(eventSeries.isDiscretionary || false);
                setSpendingStrategy(eventSeries.spendingStrategy || 'Fixed');
            }
        }
    }, [eventSeries]);

    return (
    // Rest of the component code
  );
};

export default ScenarioEventSeriesEditorModal; 