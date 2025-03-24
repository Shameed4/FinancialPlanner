/**
 * A large portion of the code in this file used AI (Cursor). I have often made prompts like
 * - Rename the variables on this page to be more consistent with the scenarios.prisma file
 * - I think the validation for this section is wrong? It seems to always assume that the duration is for a normal distribution
 * - Make the third form section about investments, which can have 0+ investments  just like asset types. Each investment should have an asset type (use the one from previous page as a dropdown), value (in dollars), tax status (non-retirement, pre-tax retirement, or after-tax retirement). Keep format similar to asset types, and make sure to update form data and errors.
 * - Remove the risk tolerance field and its validation.
 * 
 * My findings was that the AI often made mistakes, inconsistencies, and left things out
 * Unless I explicitly asked it to handle it. I usually required it to keep same format
 * as my other pages, and it would often forget to validate data correctly or sometimes
 * validate fields that were no longer being used. However, it did save a lot of time
 * handling boilerplate code, and gave a good starting point.
 */

'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: "easeOut"
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.2,
            ease: "easeIn"
        }
    }
};

const FormSection = ({ title, children, isActive, errors = {} }) => {
    if (!isActive) return null;

    const hasErrors = Object.keys(errors).length > 0;
    console.log(errors);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
        >
            <h2 className="text-black text-2xl font-semibold mb-6">{title}</h2>
            {hasErrors && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">Please fill in all required fields correctly</p>
                </div>
            )}
            {children}
        </motion.div>
    );
};

const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const ScenarioCard = ({ scenario }) => (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <h3 className="text-xl font-semibold mb-2 text-black">{scenario.name}'s Scenario</h3>
        <div className="space-y-4 text-gray-600">
            <div>
                <p className="font-medium mb-2">Basic Information</p>
                <p>Type: {scenario.forIndividual ? 'Individual' : 'Married Couple'}</p>
                <p>Birth Year: {scenario.userBirthYear}</p>
                <p>Life Expectancy: {scenario.userLifeExpectancyMean} years</p>
                <p>Life Expectancy Std Dev: {scenario.userLifeExpectancyStd} years</p>
                <p>Residence State: {scenario.residenceState}</p>
                <p>Financial Goal: ${scenario.financialGoal?.toLocaleString()}</p>
                {!scenario.forIndividual && (
                    <>
                        <p>Spouse Birth Year: {scenario.spouseBirthYear}</p>
                        <p>Spouse Life Expectancy: {scenario.spouseLifeExpectancyMean} years</p>
                        <p>Spouse Life Expectancy Std Dev: {scenario.spouseLifeExpectancyStd} years</p>
                    </>
                )}
            </div>

            <div>
                <p className="font-medium mb-2">Asset Types</p>
                {scenario.assetTypes?.map((asset, index) => (
                    <div key={index} className="ml-4 mb-2">
                        <p className="font-medium">{asset.name}</p>
                        <p className="text-sm">Description: {asset.description}</p>
                        <p className="text-sm">Return: {asset.returnMean}% (std dev: {asset.returnStd}%)</p>
                        <p className="text-sm">Expense Ratio: {asset.expenseRatio}%</p>
                        <p className="text-sm">Income: {asset.incomeMean}% (std dev: {asset.incomeStd}%)</p>
                        <p className="text-sm">Taxable: {asset.taxable ? 'Yes' : 'No'}</p>
                    </div>
                ))}
            </div>

            <div>
                <p className="font-medium mb-2">Investments</p>
                {scenario.investments?.map((investment, index) => (
                    <div key={index} className="ml-4 mb-2">
                        <p>{investment.assetType}</p>
                        <p className="text-sm">Value: ${investment.value}</p>
                        <p className="text-sm">Tax Status: {investment.taxStatus}</p>
                        {investment.withdrawalOrder && (
                            <p className="text-sm">Withdrawal Order: {investment.withdrawalOrder}</p>
                        )}
                        {investment.rothConversionOrder && (
                            <p className="text-sm">Roth Conversion Order: {investment.rothConversionOrder}</p>
                        )}
                    </div>
                ))}
            </div>

            <div>
                <p className="font-medium mb-2">Event Series</p>
                {scenario.eventSeries?.map((event, index) => (
                    <div key={index} className="ml-4 mb-2">
                        <p className="font-medium">{event.name}</p>
                        {event.description && (
                            <p className="text-sm">Description: {event.description}</p>
                        )}
                        <p className="text-sm">Type: {event.type}</p>
                        <p className="text-sm">Start Year Type: {event.startYearType}</p>
                        {event.startYearType === 'fixed' && (
                            <p className="text-sm">Start Year: {event.startYear}</p>
                        )}
                        {event.startYearType === 'uniform' && (
                            <p className="text-sm">Start Year Range: {event.startYearMin} - {event.startYearMax}</p>
                        )}
                        {event.startYearType === 'normal' && (
                            <p className="text-sm">Start Year: {event.startYearMean} (std dev: {event.startYearStd})</p>
                        )}
                        {(event.startYearType === 'withEvent' || event.startYearType === 'afterEvent') && (
                            <p className="text-sm">Reference Event: {event.startYearEvent}</p>
                        )}
                        <p className="text-sm">Duration Type: {event.durationType}</p>
                        {event.durationType === 'fixed' && (
                            <p className="text-sm">Duration: {event.durationFixed} years</p>
                        )}
                        {event.durationType === 'uniform' && (
                            <p className="text-sm">Duration Range: {event.durationMin} - {event.durationMax} years</p>
                        )}
                        {event.durationType === 'normal' && (
                            <p className="text-sm">Duration: {event.durationMean} years (std dev: {event.durationStd})</p>
                        )}
                        {(event.type === 'income' || event.type === 'expense') && (
                            <>
                                <p className="text-sm">Amount: ${event.amount}</p>
                                {event.type === 'income' && (
                                    <p className="text-sm">Social Security: {event.isSocialSecurity ? 'Yes' : 'No'}</p>
                                )}
                                {event.type === 'expense' && (
                                    <p className="text-sm">Discretionary: {event.isDiscretionary ? 'Yes' : 'No'}</p>
                                )}
                                <p className="text-sm">Annual Change Type: {event.changeType}</p>
                                <p className="text-sm">Annual Change: {event.annualChange}{event.changeType === 'percentage' ? '%' : '$'}</p>
                                <p className="text-sm">Inflation Adjusted: {event.inflationAdjusted ? 'Yes' : 'No'}</p>
                                {!scenario.forIndividual && (
                                    <p className="text-sm">User Percentage: {event.userPercentage}%</p>
                                )}
                            </>
                        )}
                        {(event.type === 'invest' || event.type === 'rebalance') && (
                            <>
                                <p className="text-sm">Allocation Type: {event.allocationType}</p>
                                {event.allocationType === 'fixed' && (
                                    <div className="text-sm">
                                        <p>Allocations:</p>
                                        {Object.entries(event.allocations || {}).map(([asset, percentage]) => (
                                            <p key={asset} className="ml-2">{asset}: {percentage}%</p>
                                        ))}
                                    </div>
                                )}
                                {event.allocationType === 'glide' && (
                                    <>
                                        <div className="text-sm">
                                            <p>Initial Allocations:</p>
                                            {Object.entries(event.initialAllocations || {}).map(([asset, percentage]) => (
                                                <p key={asset} className="ml-2">{asset}: {percentage}%</p>
                                            ))}
                                        </div>
                                        <div className="text-sm">
                                            <p>Final Allocations:</p>
                                            {Object.entries(event.finalAllocations || {}).map(([asset, percentage]) => (
                                                <p key={asset} className="ml-2">{asset}: {percentage}%</p>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {event.type === 'invest' && event.maxCashValue && (
                                    <p className="text-sm">Max Cash Value: ${event.maxCashValue}</p>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div>
                <p className="font-medium mb-2">Strategies</p>
                <div className="ml-4">
                    <p className="font-medium">Inflation Assumption</p>
                    <p className="text-sm">Type: {scenario.inflationAssumption}</p>
                    {scenario.inflationAssumption === 'fixed' && (
                        <p className="text-sm">Rate: {scenario.inflation}%</p>
                    )}
                    {scenario.inflationAssumption === 'uniform' && (
                        <p className="text-sm">Range: {scenario.inflationMin}% - {scenario.inflationMax}%</p>
                    )}
                    {scenario.inflationAssumption === 'normal' && (
                        <p className="text-sm">Mean: {scenario.inflationMean}% (std dev: {scenario.inflationStd}%)</p>
                    )}

                    <p className="font-medium mt-2">Tax Optimization</p>
                    <p className="text-sm">Enabled: {scenario.enableTaxOptimization ? 'Yes' : 'No'}</p>
                    {scenario.enableTaxOptimization && (
                        <p className="text-sm">Period: {scenario.rothOptimizationStartYear} - {scenario.rothOptimizationEndYear}</p>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const CreateScenarioForm = ({ onScenarioCreate, onCancel }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        forIndividual: true,
        userBirthYear: '',
        userLifeExpectancyMean: '',
        userLifeExpectancyStd: '0',
        spouseBirthYear: '',
        spouseLifeExpectancyMean: '',
        spouseLifeExpectancyStd: '0',
        currentSavings: '',
        monthlyContribution: '',
        riskTolerance: '',
        investmentPreference: '',
        assetTypes: [],
        investments: [],
        eventSeries: [],
        inflationAssumption: 'fixed',
        inflation: '',
        inflationMin: '',
        inflationMax: '',
        inflationMean: '',
        inflationStd: '',
        rothOptimizationStartYear: '',
        rothOptimizationEndYear: '',
        residenceState: '',
        financialGoal: '',
        initialAfterTaxRetirementContributionLimit: ''
    });
    const [errors, setErrors] = useState({});

    const validateStep = (step) => {
        const newErrors = {};
        switch (step) {
            case 1:
                if (!formData.name) newErrors.name = 'Name is required';
                if (!formData.forIndividual) newErrors.forIndividual = 'Please select a type';
                if (!formData.userBirthYear) newErrors.userBirthYear = 'Birth year is required';
                if (!formData.userLifeExpectancyMean) newErrors.userLifeExpectancyMean = 'Life expectancy is required';
                if (!formData.userLifeExpectancyStd) newErrors.userLifeExpectancyStd = 'Life expectancy standard deviation is required';
                if (!formData.residenceState) newErrors.residenceState = 'Residence state is required';
                if (!formData.financialGoal) newErrors.financialGoal = 'Financial goal is required';
                if (formData.financialGoal && (isNaN(formData.financialGoal) || parseFloat(formData.financialGoal) < 0)) {
                    newErrors.financialGoal = 'Financial goal must be a non-negative number';
                }
                if (!formData.forIndividual) {
                    if (!formData.spouseBirthYear) newErrors.spouseBirthYear = 'Spouse birth year is required';
                    if (!formData.spouseLifeExpectancyMean) newErrors.spouseLifeExpectancyMean = 'Spouse life expectancy is required';
                    if (!formData.spouseLifeExpectancyStd) newErrors.spouseLifeExpectancyStd = 'Spouse life expectancy standard deviation is required';
                }
                // Validate inflation assumption
                if (!formData.inflationAssumption) {
                    newErrors.inflationAssumption = 'Inflation assumption type is required';
                } else {
                    switch (formData.inflationAssumption) {
                        case 'fixed':
                            if (!formData.inflation || isNaN(formData.inflation) || parseFloat(formData.inflation) < 0) {
                                newErrors.inflation = 'Valid fixed inflation rate is required';
                            }
                            break;
                        case 'uniform':
                            if (!formData.inflationMin || !formData.inflationMax || 
                                isNaN(formData.inflationMin) || isNaN(formData.inflationMax) || 
                                parseFloat(formData.inflationMin) < 0 || parseFloat(formData.inflationMax) < parseFloat(formData.inflationMin)) {
                                newErrors.inflationMin = 'Valid uniform distribution range is required';
                            }
                            break;
                        case 'normal':
                            if (!formData.inflationMean || !formData.inflationStd || 
                                isNaN(formData.inflationMean) || isNaN(formData.inflationStd) || 
                                parseFloat(formData.inflationMean) < 0 || parseFloat(formData.inflationStd) <= 0) {
                                newErrors.inflationMean = 'Valid normal distribution parameters are required';
                            }
                            break;
                    }
                }
                // Validate initial after tax retirement contribution limit
                if (!formData.initialAfterTaxRetirementContributionLimit) {
                    newErrors.initialAfterTaxRetirementContributionLimit = 'Initial after tax retirement contribution limit is required';
                } else if (isNaN(formData.initialAfterTaxRetirementContributionLimit) || parseFloat(formData.initialAfterTaxRetirementContributionLimit) < 0) {
                    newErrors.initialAfterTaxRetirementContributionLimit = 'Initial after tax retirement contribution limit must be a non-negative number';
                }
                break;
            case 2:
                formData.assetTypes?.forEach((asset, index) => {
                    if (!asset.name) newErrors[`assetTypes.${index}.name`] = 'Asset name is required';
                    if (!asset.description) newErrors[`assetTypes.${index}.description`] = 'Description is required';
                    if (!asset.returnMean) newErrors[`assetTypes.${index}.returnMean`] = 'Expected return is required';
                    if (!asset.returnStd) newErrors[`assetTypes.${index}.returnStd`] = 'Return standard deviation is required';
                    if (!asset.expenseRatio) newErrors[`assetTypes.${index}.expenseRatio`] = 'Expense ratio is required';
                    if (!asset.incomeMean) newErrors[`assetTypes.${index}.incomeMean`] = 'Income mean is required';
                });
                break;
            case 3:
                formData.investments.forEach((investment, index) => {
                    if (!investment.assetType) newErrors[`investments.${index}.assetType`] = 'Asset type is required';
                    if (!investment.value) newErrors[`investments.${index}.value`] = 'Value is required';
                    if (!investment.taxStatus) newErrors[`investments.${index}.taxStatus`] = 'Tax status is required';
                    
                    // Validate that the selected asset type exists
                    if (investment.assetType && !formData.assetTypes?.some(asset => asset.name === investment.assetType)) {
                        newErrors[`investments.${index}.assetType`] = 'Selected asset type does not exist';
                    }
                    
                    // Validate that value is a positive number
                    if (investment.value && (isNaN(investment.value) || parseFloat(investment.value) <= 0)) {
                        newErrors[`investments.${index}.value`] = 'Value must be a positive number';
                    }
                });
                break;
            case 4:
                formData.eventSeries?.forEach((event, index) => {
                    if (!event.name) newErrors[`eventSeries.${index}.name`] = 'Event name is required';
                    if (!event.type) newErrors[`eventSeries.${index}.type`] = 'Event type is required';
                    if (!event.startYearType) newErrors[`eventSeries.${index}.startYearType`] = 'Start year type is required';
                    
                    // Validate start year based on type
                    if (event.startYearType === 'fixed' && (!event.startYear || isNaN(event.startYear))) {
                        newErrors[`eventSeries.${index}.startYear`] = 'Start year is required';
                    } else if (event.startYearType === 'relative' && (!event.relativeStartYear || isNaN(event.relativeStartYear))) {
                        newErrors[`eventSeries.${index}.relativeStartYear`] = 'Relative start year is required';
                    }
                    
                    // Validate duration
                    if (!event.durationType) {
                        newErrors[`eventSeries.${index}.durationType`] = 'Duration type is required';
                    } else {
                        switch (event.durationType) {
                            case 'fixed':
                                if (!event.durationFixed || isNaN(event.durationFixed) || parseFloat(event.durationFixed) <= 0) {
                                    newErrors[`eventSeries.${index}.durationFixed`] = 'Duration must be a positive number';
                                }
                                break;
                            case 'uniform':
                                if (!event.durationMin || !event.durationMax || 
                                    isNaN(event.durationMin) || isNaN(event.durationMax) || 
                                    parseFloat(event.durationMin) <= 0 || parseFloat(event.durationMax) < parseFloat(event.durationMin)) {
                                    newErrors[`eventSeries.${index}.durationMin`] = 'Invalid uniform duration range';
                                }
                                break;
                            case 'normal':
                                if (!event.durationMean || !event.durationStd || 
                                    isNaN(event.durationMean) || isNaN(event.durationStd) || 
                                    parseFloat(event.durationMean) <= 0 || parseFloat(event.durationStd) < 0) {
                                    newErrors[`eventSeries.${index}.durationMean`] = 'Invalid normal duration parameters';
                                }
                                break;
                        }
                    }
                    
                    // Validate event-specific fields
                    if (event.type === 'income' || event.type === 'expense') {
                        if (!event.amount || isNaN(event.amount) || parseFloat(event.amount) <= 0) {
                            newErrors[`eventSeries.${index}.amount`] = 'Amount must be a positive number';
                        }
                        
                        // Validate user percentage for married couples
                        if (formData.forIndividual === false && (!event.userPercentage || isNaN(event.userPercentage) || 
                            parseFloat(event.userPercentage) < 0 || parseFloat(event.userPercentage) > 100)) {
                            newErrors[`eventSeries.${index}.userPercentage`] = 'User percentage must be between 0 and 100';
                        }
                    }
                    
                    // Validate allocation fields for invest/rebalance events
                    if (event.type === 'invest' || event.type === 'rebalance') {
                        if (!event.allocationType) {
                            newErrors[`eventSeries.${index}.allocationType`] = 'Asset allocation type is required';
                        } else if (event.allocationType === 'fixed') {
                            // Validate fixed allocations
                            if (!event.allocations || Object.keys(event.allocations).length === 0) {
                                newErrors[`eventSeries.${index}.allocations`] = 'Asset allocations are required';
                            } else {
                                // Filter out allocations for pre-tax investments
                                const filteredAllocations = {};
                                Object.entries(event.allocations).forEach(([assetName, percentage]) => {
                                    // Check if this asset type exists in any pre-tax investment
                                    const isPreTax = formData.investments?.some(
                                        inv => inv.assetType === assetName && inv.taxStatus === 'pre-tax'
                                    );
                                    if (!isPreTax) {
                                        filteredAllocations[assetName] = percentage;
                                    }
                                });
                                
                                // Check if allocations sum to 100%
                                const sum = Object.values(filteredAllocations)
                                    .reduce((acc, val) => acc + parseFloat(val || 0), 0);
                                if (Math.abs(sum - 100) > 0.1) { // Allow small rounding errors
                                    newErrors[`eventSeries.${index}.allocations`] = 'Asset allocations must sum to 100%';
                                }
                            }
                        } else if (event.allocationType === 'glide') {
                            // Validate glide path allocations
                            if (!event.initialAllocations || Object.keys(event.initialAllocations).length === 0) {
                                newErrors[`eventSeries.${index}.initialAllocations`] = 'Initial allocations are required';
                            } else {
                                // Filter out allocations for pre-tax investments
                                const filteredInitialAllocations = {};
                                Object.entries(event.initialAllocations).forEach(([assetName, percentage]) => {
                                    // Check if this asset type exists in any pre-tax investment
                                    const isPreTax = formData.investments?.some(
                                        inv => inv.assetType === assetName && inv.taxStatus === 'pre-tax'
                                    );
                                    if (!isPreTax) {
                                        filteredInitialAllocations[assetName] = percentage;
                                    }
                                });
                                
                                const initialSum = Object.values(filteredInitialAllocations)
                                    .reduce((acc, val) => acc + parseFloat(val || 0), 0);
                                if (Math.abs(initialSum - 100) > 0.1) {
                                    newErrors[`eventSeries.${index}.initialAllocations`] = 'Initial allocations must sum to 100%';
                                }
                            }
                            
                            if (!event.finalAllocations || Object.keys(event.finalAllocations).length === 0) {
                                newErrors[`eventSeries.${index}.finalAllocations`] = 'Final allocations are required';
                            } else {
                                // Filter out allocations for pre-tax investments
                                const filteredFinalAllocations = {};
                                Object.entries(event.finalAllocations).forEach(([assetName, percentage]) => {
                                    // Check if this asset type exists in any pre-tax investment
                                    const isPreTax = formData.investments?.some(
                                        inv => inv.assetType === assetName && inv.taxStatus === 'pre-tax'
                                    );
                                    if (!isPreTax) {
                                        filteredFinalAllocations[assetName] = percentage;
                                    }
                                });
                                
                                const finalSum = Object.values(filteredFinalAllocations)
                                    .reduce((acc, val) => acc + parseFloat(val || 0), 0);
                                if (Math.abs(finalSum - 100) > 0.1) {
                                    newErrors[`eventSeries.${index}.finalAllocations`] = 'Final allocations must sum to 100%';
                                }
                            }
                        }
                        
                        // Validate maxCashValue for invest events if provided
                        if (event.type === 'invest' && event.maxCashValue && 
                            (isNaN(event.maxCashValue) || parseFloat(event.maxCashValue) <= 0)) {
                            newErrors[`eventSeries.${index}.maxCashValue`] = 'Maximum cash value must be a positive number';
                        }
                    }
                });
                break;
            case 5:
                // Validate tax optimization if enabled
                if (formData.enableTaxOptimization) {
                    if (!formData.rothOptimizationStartYear || !formData.rothOptimizationEndYear || 
                        isNaN(formData.rothOptimizationStartYear) || isNaN(formData.rothOptimizationEndYear) || 
                        parseInt(formData.rothOptimizationStartYear) < 0 || parseInt(formData.rothOptimizationEndYear) < parseInt(formData.rothOptimizationStartYear)) {
                        newErrors.rothOptimizationStartYear = 'Valid tax optimization year range is required';
                    }
                }

                // Validate withdrawal strategy
                if (formData.investments?.length > 0) {
                    const withdrawalOrders = formData.investments
                        .map(inv => inv.withdrawalOrder)
                        .filter(order => order !== undefined && order !== null);
                    
                    if (withdrawalOrders.length > 0) {
                        const uniqueOrders = new Set(withdrawalOrders);
                        if (withdrawalOrders.length !== uniqueOrders.size) {
                            newErrors.withdrawalStrategy = 'Each investment must have a unique withdrawal order';
                        }
                    }
                }

                // Validate Roth conversion strategy
                const preTaxInvestments = formData.investments?.filter(inv => inv.taxStatus === 'pre-tax');
                if (preTaxInvestments?.length > 0) {
                    const conversionOrders = preTaxInvestments
                        .map(inv => inv.rothConversionOrder)
                        .filter(order => order !== undefined && order !== null);
                    
                    if (conversionOrders.length > 0) {
                        const uniqueOrders = new Set(conversionOrders);
                        if (conversionOrders.length !== uniqueOrders.size) {
                            newErrors.rothConversionStrategy = 'Each pre-tax investment must have a unique Roth conversion order';
                        }
                    }
                }
                break;
        }
        return newErrors;
    };

    const handleNext = () => {
        const stepErrors = validateStep(currentStep);
        if (Object.keys(stepErrors).length === 0) {
            if (currentStep < 5) {
                setCurrentStep(currentStep + 1);
            } else {
                // Convert specific numeric fields to numbers, preserving string fields
                const prepareFormDataForSubmission = (data) => {
                    // List of field paths that should be converted to numbers
                    const numericFields = [
                        // Basic information
                        'userBirthYear', 'userLifeExpectancyMean', 'userLifeExpectancyStd',
                        'spouseBirthYear', 'spouseLifeExpectancyMean', 'spouseLifeExpectancyStd',
                        'financialGoal', 'initialAfterTaxRetirementContributionLimit',
                        // Inflation fields
                        'inflation', 'inflationMin', 'inflationMax', 'inflationMean', 'inflationStd',
                        // Tax optimization
                        'rothOptimizationStartYear', 'rothOptimizationEndYear'
                    ];
                    
                    // Helper to check if a path should be numeric
                    const shouldBeNumeric = (path) => {
                        // Direct match for top-level fields
                        if (numericFields.includes(path)) return true;
                        
                        // Check for array item fields
                        // Asset types
                        if (path.match(/^assetTypes\.\d+\.(returnMean|returnStd|expenseRatio|incomeMean|incomeStd)$/)) return true;
                        
                        // Investments
                        if (path.match(/^investments\.\d+\.(value|withdrawalOrder|rothConversionOrder)$/)) return true;
                        
                        // Event series
                        if (path.match(/^eventSeries\.\d+\.(startYear|startYearMin|startYearMax|startYearMean|startYearStd|durationFixed|durationMin|durationMax|durationMean|durationStd|amount|annualChange|userPercentage|maxCashValue)$/)) return true;
                        
                        // Allocations percentages
                        if (path.match(/^eventSeries\.\d+\.(allocations|initialAllocations|finalAllocations)\.[^.]+$/)) return true;
                        
                        return false;
                    };
                    
                    // Recursive function to process the object
                    const processObject = (obj, path = '') => {
                        const result = {};
                        
                        Object.entries(obj).forEach(([key, value]) => {
                            const currentPath = path ? `${path}.${key}` : key;
                            
                            // Process arrays
                            if (Array.isArray(value)) {
                                result[key] = value.map((item, index) => {
                                    if (item !== null && typeof item === 'object') {
                                        return processObject(item, `${currentPath}.${index}`);
                                    }
                                    
                                    const itemPath = `${currentPath}.${index}`;
                                    if (shouldBeNumeric(itemPath) && typeof item === 'string' && !isNaN(Number(item))) {
                                        return Number(item);
                                    }
                                    return item;
                                });
                            }
                            // Process nested objects
                            else if (value !== null && typeof value === 'object') {
                                result[key] = processObject(value, currentPath);
                            }
                            // Process primitive values
                            else if (shouldBeNumeric(currentPath) && typeof value === 'string' && !isNaN(Number(value))) {
                                result[key] = Number(value);
                            }
                            else {
                                result[key] = value;
                            }
                        });
                        
                        return result;
                    };
                    
                    return processObject(data);
                };

                const numericFormData = prepareFormDataForSubmission(formData);
                console.log('Prepared data with numeric values:', numericFormData);
                onScenarioCreate(numericFormData);
            }
            setErrors({});
        } else {
            setErrors(stepErrors);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const getInputClassName = (fieldName) => {
        return `w-full p-2 border rounded-md ${errors[fieldName]
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-700 focus:ring-black focus:border-black'
            } transition-colors`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
        >
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={onCancel}
                    className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
                >
                    ✕
                </button>
            </div>

            <div className="flex gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((step) => (
                    <div
                        key={step}
                        className={`h-2 rounded-full flex-1 ${step <= currentStep ? 'bg-black' : 'bg-gray-200'
                            }`}
                    />
                ))}
            </div>

            <FormSection title="General Information" isActive={currentStep === 1} errors={errors}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`${getInputClassName('name')} text-black`}
                            placeholder="Ex: John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Is this scenario intended for an individual or a married couple?
                        </label>
                        <select
                            name="forIndividual"
                            value={formData.forIndividual}
                            onChange={handleInputChange}
                            className={`${getInputClassName('forIndividual')} text-black`}
                        >
                            <option value={true}>Individual</option>
                            <option value={false}>Married Couple</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Birth Year</label>
                        <input
                            type="number"
                            name="userBirthYear"
                            value={formData.userBirthYear}
                            onChange={handleInputChange}
                            className={`${getInputClassName('userBirthYear')} text-black`}
                            placeholder="Ex: 1990"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Life Expectancy (years)</label>
                        <input
                            type="number"
                            name="userLifeExpectancyMean"
                            value={formData.userLifeExpectancyMean}
                            onChange={handleInputChange}
                            className={`${getInputClassName('userLifeExpectancyMean')} text-black`}
                            placeholder="Ex: 90"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Life Expectancy Standard Deviation (years)</label>
                        <input
                            type="number"
                            name="userLifeExpectancyStd"
                            value={formData.userLifeExpectancyStd}
                            onChange={handleInputChange}
                            className={`${getInputClassName('userLifeExpectancyStd')} text-black`}
                            placeholder="90"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Residence State</label>
                        <select
                            name="residenceState"
                            value={formData.residenceState}
                            onChange={handleInputChange}
                            className={`${getInputClassName('residenceState')} text-black`}
                        >
                            <option value="">Select a state...</option>
                            {US_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Financial Goal ($)</label>
                        <input
                            type="number"
                            name="financialGoal"
                            value={formData.financialGoal}
                            onChange={handleInputChange}
                            className={`${getInputClassName('financialGoal')} text-black`}
                            placeholder="Ex: 1000000"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Initial After Tax Retirement Contribution Limit ($)</label>
                        <input
                            type="number"
                            name="initialAfterTaxRetirementContributionLimit"
                            value={formData.initialAfterTaxRetirementContributionLimit}
                            onChange={handleInputChange}
                            className={`${getInputClassName('initialAfterTaxRetirementContributionLimit')} text-black`}
                            placeholder="Ex: 6500"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    {!formData.forIndividual && (<>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Birth Year</label>
                            <input
                                type="number"
                                name="spouseBirthYear"
                                value={formData.spouseBirthYear}
                                onChange={handleInputChange}
                                className={`${getInputClassName('spouseBirthYear')} text-black`}
                                placeholder="1992"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Spouse Life Expectancy (years)
                            </label>
                            <input
                                type="number"
                                name="spouseLifeExpectancyMean"
                                value={formData.spouseLifeExpectancyMean}
                                onChange={handleInputChange}
                                className={`${getInputClassName('spouseLifeExpectancyMean')} text-black`}
                                placeholder="Ex: 90"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Life Expectancy Standard Deviation (years)</label>
                            <input
                                type="number"
                                name="spouseLifeExpectancyStd"
                                value={formData.spouseLifeExpectancyStd}
                                onChange={handleInputChange}
                                className={`${getInputClassName('spouseLifeExpectancyStd')} text-black`}
                                placeholder="Ex: 90"
                            />
                        </div>
                    </>)}
                    
                    <div className="mt-8">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Assumption</label>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={formData.inflationAssumption}
                                    onChange={(e) => {
                                        setFormData({
                                            ...formData,
                                            inflationAssumption: e.target.value,
                                            inflation: e.target.value === 'fixed' ? formData.inflation : null,
                                            inflationMin: e.target.value === 'uniform' ? formData.inflationMin : null,
                                            inflationMax: e.target.value === 'uniform' ? formData.inflationMax : null,
                                            inflationMean: e.target.value === 'normal' ? formData.inflationMean : null,
                                            inflationStd: e.target.value === 'normal' ? formData.inflationStd : null
                                        });
                                    }}
                                    className={`${getInputClassName('inflationAssumption')} text-black`}
                                >
                                    <option value="fixed">Fixed Percentage</option>
                                    <option value="uniform">Uniform Distribution</option>
                                    <option value="normal">Normal Distribution</option>
                                </select>
                            </div>

                            {formData.inflationAssumption === 'fixed' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Inflation Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.inflation || ''}
                                        onChange={(e) => {
                                            setFormData({ ...formData, inflation: e.target.value });
                                        }}
                                        className={`${getInputClassName('inflation')} text-black`}
                                        placeholder="Ex: 2.0"
                                    />
                                </div>
                            )}

                            {formData.inflationAssumption === 'uniform' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.inflationMin || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, inflationMin: e.target.value });
                                            }}
                                            className={`${getInputClassName('inflationMin')} text-black`}
                                            placeholder="Ex: 1.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.inflationMax || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, inflationMax: e.target.value });
                                            }}
                                            className={`${getInputClassName('inflationMax')} text-black`}
                                            placeholder="Ex: 3.0"
                                        />
                                    </div>
                                </>
                            )}

                            {formData.inflationAssumption === 'normal' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mean Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.inflationMean || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, inflationMean: e.target.value });
                                            }}
                                            className={`${getInputClassName('inflationMean')} text-black`}
                                            placeholder="Ex: 2.0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Standard Deviation (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.inflationStd || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, inflationStd: e.target.value });
                                            }}
                                            className={`${getInputClassName('inflationStd')} text-black`}
                                            placeholder="Ex: 0.5"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Asset Types" isActive={currentStep === 2} errors={errors}>
                <div className="space-y-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Types</label>
                        <p className="text-sm text-gray-500 mb-2">Add the different types of assets in your portfolio</p>

                        {formData.assetTypes?.map((asset, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-md mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                                        <input
                                            type="text"
                                            value={asset.name}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].name = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.name`)} text-black`}
                                            placeholder="Asset Type Name"
                                        />
                                        {errors[`assetTypes.${index}.name`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.name`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={asset.description}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].description = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.description`)} text-black`}
                                            placeholder="Description"
                                        />
                                        {errors[`assetTypes.${index}.description`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.description`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Annual Return Mean (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={asset.returnMean}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].returnMean = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.returnMean`)} text-black`}
                                            placeholder="Ex: 7.5"
                                        />
                                        {errors[`assetTypes.${index}.returnMean`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.returnMean`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Return Standard Deviation (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={asset.returnStd}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].returnStd = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.returnStd`)} text-black`}
                                            placeholder="Ex: 15.0"
                                        />
                                        {errors[`assetTypes.${index}.returnStd`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.returnStd`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Ratio (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={asset.expenseRatio}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].expenseRatio = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.expenseRatio`)} text-black`}
                                            placeholder="Ex: 0.05"
                                        />
                                        {errors[`assetTypes.${index}.expenseRatio`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.expenseRatio`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Annual Income Mean (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={asset.incomeMean}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].incomeMean = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.incomeMean`)} text-black`}
                                            placeholder="Ex: 2.0"
                                        />
                                        {errors[`assetTypes.${index}.incomeMean`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.incomeMean`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Income Standard Deviation (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={asset.incomeStd}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].incomeStd = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.incomeStd`)} text-black`}
                                            placeholder="Ex: 0.5"
                                        />
                                        {errors[`assetTypes.${index}.incomeStd`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.incomeStd`]}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        <label className="inline-flex items-center mt-3">
                                            <input
                                                type="checkbox"
                                                checked={asset.taxable}
                                                onChange={(e) => {
                                                    const newAssetTypes = [...formData.assetTypes];
                                                    newAssetTypes[index].taxable = e.target.checked;
                                                    setFormData({ ...formData, assetTypes: newAssetTypes });
                                                }}
                                                className="form-checkbox h-5 w-5 text-black"
                                            />
                                            <span className="ml-2 text-gray-700">Taxable</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newAssetTypes = formData.assetTypes.filter((_, i) => i !== index);
                                            setFormData({ ...formData, assetTypes: newAssetTypes });
                                        }}
                                        className="p-2 text-red-500 hover:text-red-700"
                                    >
                                        Remove Asset
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => {
                                const assetTypes = formData.assetTypes || [];
                                setFormData({
                                    ...formData,
                                    assetTypes: [...assetTypes, {
                                        name: '',
                                        description: '',
                                        returnMean: '',
                                        returnStd: '',
                                        expenseRatio: '',
                                        incomeMean: '',
                                        incomeStd: '',
                                        taxable: false
                                    }]
                                });
                            }}
                            className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            + Add Asset Type
                        </button>
                    </div>
                </div>
            </FormSection>

            {/* generated by cursor. Prompt: Make the third form section about investments, which can have 0+ investments  just like asset types. Each investment should have an asset type (use the one from previous page as a dropdown), value (in dollars), tax status (non-retirement, pre-tax retirement, or after-tax retirement). Keep format similar to asset types, and make sure to update form data and errors. */}
            <FormSection title="Investments" isActive={currentStep === 3} errors={errors}>
                <div className="space-y-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Investments</label>
                        <p className="text-sm text-gray-500 mb-2">Add your current investments and their details</p>

                        {formData.investments?.map((investment, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-md mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                                        <select
                                            value={investment.assetType}
                                            onChange={(e) => {
                                                const newInvestments = [...formData.investments];
                                                newInvestments[index].assetType = e.target.value;
                                                setFormData({ ...formData, investments: newInvestments });
                                            }}
                                            className={`${getInputClassName(`investments.${index}.assetType`)} text-black`}
                                        >
                                            <option value="">Select an asset type...</option>
                                            {formData.assetTypes?.map((asset, assetIndex) => (
                                                <option key={assetIndex} value={asset.name}>
                                                    {asset.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors[`investments.${index}.assetType`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`investments.${index}.assetType`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={investment.value}
                                            onChange={(e) => {
                                                const newInvestments = [...formData.investments];
                                                newInvestments[index].value = e.target.value;
                                                setFormData({ ...formData, investments: newInvestments });
                                            }}
                                            className={`${getInputClassName(`investments.${index}.value`)} text-black`}
                                            placeholder="Ex: 10000"
                                        />
                                        {errors[`investments.${index}.value`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`investments.${index}.value`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Status</label>
                                        <select
                                            value={investment.taxStatus}
                                            onChange={(e) => {
                                                const newInvestments = [...formData.investments];
                                                newInvestments[index].taxStatus = e.target.value;
                                                setFormData({ ...formData, investments: newInvestments });
                                            }}
                                            className={`${getInputClassName(`investments.${index}.taxStatus`)} text-black`}
                                        >
                                            <option value="">Select tax status...</option>
                                            <option value="non-retirement">Non-Retirement</option>
                                            <option value="pre-tax">Pre-Tax Retirement</option>
                                            <option value="after-tax">After-Tax Retirement</option>
                                        </select>
                                        {errors[`investments.${index}.taxStatus`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`investments.${index}.taxStatus`]}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newInvestments = formData.investments.filter((_, i) => i !== index);
                                            setFormData({ ...formData, investments: newInvestments });
                                        }}
                                        className="p-2 text-red-500 hover:text-red-700"
                                    >
                                        Remove Investment
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => {
                                const investments = formData.investments || [];
                                setFormData({
                                    ...formData,
                                    investments: [...investments, {
                                        assetType: '',
                                        value: '',
                                        taxStatus: ''
                                    }]
                                });
                            }}
                            className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            + Add Investment
                        </button>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Event Series" isActive={currentStep === 4} errors={errors}>
                <div className="space-y-4">
                    <div className="mt-8">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Series</label>
                        <p className="text-sm text-gray-500 mb-2">Add financial events that will occur over time</p>

                        {formData.eventSeries?.map((event, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-md mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                                        <input
                                            type="text"
                                            value={event.name}
                                            onChange={(e) => {
                                                const newEventSeries = [...formData.eventSeries];
                                                newEventSeries[index].name = e.target.value;
                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                            }}
                                            className={`${getInputClassName(`eventSeries.${index}.name`)} text-black`}
                                            placeholder="Ex: College Education"
                                        />
                                        {errors[`eventSeries.${index}.name`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.name`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={event.description || ''}
                                            onChange={(e) => {
                                                const newEventSeries = [...formData.eventSeries];
                                                newEventSeries[index].description = e.target.value;
                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                            }}
                                            className={`${getInputClassName(`eventSeries.${index}.description`)} text-black`}
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Year Type</label>
                                        <select
                                            value={event.startYearType}
                                            onChange={(e) => {
                                                const newEventSeries = [...formData.eventSeries];
                                                newEventSeries[index].startYearType = e.target.value;
                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                            }}
                                            className={`${getInputClassName(`eventSeries.${index}.startYearType`)} text-black`}
                                        >
                                            <option value="">Select start year type...</option>
                                            <option value="fixed">Fixed Value</option>
                                            <option value="uniform">Uniform Distribution</option>
                                            <option value="normal">Normal Distribution</option>
                                            <option value="withEvent">Start with Another Event</option>
                                            <option value="afterEvent">Start After Another Event</option>
                                        </select>
                                        {errors[`eventSeries.${index}.startYearType`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.startYearType`]}</p>
                                        )}
                                    </div>

                                    {/* Start Year Fields based on type */}
                                    {event.startYearType === 'fixed' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label>
                                            <input
                                                type="number"
                                                value={event.startYear || ''}
                                                onChange={(e) => {
                                                    const newEventSeries = [...formData.eventSeries];
                                                    newEventSeries[index].startYear = e.target.value;
                                                    setFormData({ ...formData, eventSeries: newEventSeries });
                                                }}
                                                className={`${getInputClassName(`eventSeries.${index}.startYear`)} text-black`}
                                                placeholder="Ex: 2025"
                                            />
                                            {errors[`eventSeries.${index}.startYear`] && (
                                                <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.startYear`]}</p>
                                            )}
                                        </div>
                                    )}

                                    {event.startYearType === 'uniform' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Year</label>
                                                <input
                                                    type="number"
                                                    value={event.startYearMin || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].startYearMin = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.startYearMin`)} text-black`}
                                                    placeholder="Ex: 2025"
                                                />
                                                {errors[`eventSeries.${index}.startYearMin`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.startYearMin`]}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Year</label>
                                                <input
                                                    type="number"
                                                    value={event.startYearMax || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].startYearMax = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.startYearMax`)} text-black`}
                                                    placeholder="Ex: 2030"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {event.startYearType === 'normal' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Mean Year</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={event.startYearMean || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].startYearMean = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.startYearMean`)} text-black`}
                                                    placeholder="2025"
                                                />
                                                {errors[`eventSeries.${index}.startYearMean`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.startYearMean`]}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Standard Deviation</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={event.startYearStd || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].startYearStd = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.startYearStd`)} text-black`}
                                                    placeholder="1.0"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {(event.startYearType === 'withEvent' || event.startYearType === 'afterEvent') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Event</label>
                                            <select
                                                value={event.startYearEvent || ''}
                                                onChange={(e) => {
                                                    const newEventSeries = [...formData.eventSeries];
                                                    newEventSeries[index].startYearEvent = e.target.value;
                                                    setFormData({ ...formData, eventSeries: newEventSeries });
                                                }}
                                                className={`${getInputClassName(`eventSeries.${index}.startYearEvent`)} text-black`}
                                            >
                                                <option value="">Select reference event...</option>
                                                {formData.eventSeries.map((e, i) => i !== index && (
                                                    <option key={i} value={e.name}>{e.name}</option>
                                                ))}
                                            </select>
                                            {errors[`eventSeries.${index}.startYearEvent`] && (
                                                <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.startYearEvent`]}</p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration Type</label>
                                        <select
                                            value={event.durationType || ''}
                                            onChange={(e) => {
                                                const newEventSeries = [...formData.eventSeries];
                                                newEventSeries[index].durationType = e.target.value;
                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                            }}
                                            className={`${getInputClassName(`eventSeries.${index}.durationType`)} text-black`}
                                        >
                                            <option value="">Select duration type...</option>
                                            <option value="fixed">Fixed</option>
                                            <option value="uniform">Uniform</option>
                                            <option value="normal">Normal</option>
                                        </select>
                                    </div>

                                    {event.durationType === 'fixed' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (years)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={event.durationFixed || ''}
                                                onChange={(e) => {
                                                    const newEventSeries = [...formData.eventSeries];
                                                    newEventSeries[index].durationFixed = e.target.value;
                                                    newEventSeries[index].durationMean = e.target.value; // For backward compatibility
                                                    setFormData({ ...formData, eventSeries: newEventSeries });
                                                }}
                                                className={`${getInputClassName(`eventSeries.${index}.durationFixed`)} text-black`}
                                                placeholder="4.0"
                                            />
                                            {errors[`eventSeries.${index}.durationFixed`] && (
                                                <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.durationFixed`]}</p>
                                            )}
                                        </div>
                                    )}

                                    {event.durationType === 'uniform' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Duration (years)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={event.durationMin || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].durationMin = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.durationMin`)} text-black`}
                                                    placeholder="2.0"
                                                />
                                                {errors[`eventSeries.${index}.durationMin`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.durationMin`]}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Duration (years)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={event.durationMax || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].durationMax = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.durationMax`)} text-black`}
                                                    placeholder="6.0"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {event.durationType === 'normal' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration Mean (years)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={event.durationMean || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].durationMean = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.durationMean`)} text-black`}
                                                    placeholder="4.0"
                                                />
                                                {errors[`eventSeries.${index}.durationMean`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.durationMean`]}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration Std Dev (years)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={event.durationStd || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].durationStd = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.durationStd`)} text-black`}
                                                    placeholder="0.5"
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                                        <select
                                            value={event.type}
                                            onChange={(e) => {
                                                const newEventSeries = [...formData.eventSeries];
                                                newEventSeries[index].type = e.target.value;
                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                            }}
                                            className={`${getInputClassName(`eventSeries.${index}.type`)} text-black`}
                                        >
                                            <option value="">Select event type...</option>
                                            <option value="income">Income</option>
                                            <option value="expense">Expense</option>
                                            <option value="invest">Invest</option>
                                            <option value="rebalance">Rebalance</option>
                                        </select>
                                        {errors[`eventSeries.${index}.type`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.type`]}</p>
                                        )}
                                    </div>

                                    {/* Type-specific fields */}
                                    {(event.type === 'income' || event.type === 'expense') && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Amount ($)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={event.amount || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].amount = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.amount`)} text-black`}
                                                    placeholder="10000"
                                                />
                                                {errors[`eventSeries.${index}.amount`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.amount`]}</p>
                                                )}
                                            </div>
                                            {event.type === 'income' && (
                                                <div className="flex items-center">
                                                    <label className="inline-flex items-center mt-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={event.isSocialSecurity || false}
                                                            onChange={(e) => {
                                                                const newEventSeries = [...formData.eventSeries];
                                                                newEventSeries[index].isSocialSecurity = e.target.checked;
                                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                                            }}
                                                            className="form-checkbox h-5 w-5 text-black"
                                                        />
                                                        <span className="ml-2 text-gray-700">Social Security Income</span>
                                                    </label>
                                                </div>
                                            )}
                                            {event.type === 'expense' && (
                                                <div className="flex items-center">
                                                    <label className="inline-flex items-center mt-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={event.isDiscretionary || false}
                                                            onChange={(e) => {
                                                                const newEventSeries = [...formData.eventSeries];
                                                                newEventSeries[index].isDiscretionary = e.target.checked;
                                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                                            }}
                                                            className="form-checkbox h-5 w-5 text-black"
                                                        />
                                                        <span className="ml-2 text-gray-700">Discretionary Expense</span>
                                                    </label>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Change Type</label>
                                                <select
                                                    value={event.changeType || 'fixed'}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].changeType = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.changeType`)} text-black`}
                                                >
                                                    <option value="fixed">Fixed Amount</option>
                                                    <option value="percentage">Percentage</option>
                                                </select>
                                                {errors[`eventSeries.${index}.changeType`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.changeType`]}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Annual Change {event.changeType === 'percentage' ? '(%)' : '($)'}
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={event.annualChange || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].annualChange = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.annualChange`)} text-black`}
                                                    placeholder={event.changeType === 'percentage' ? "3.0" : "500"}
                                                />
                                                {errors[`eventSeries.${index}.annualChange`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.annualChange`]}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center">
                                                <label className="inline-flex items-center mt-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={event.inflationAdjusted || false}
                                                        onChange={(e) => {
                                                            const newEventSeries = [...formData.eventSeries];
                                                            newEventSeries[index].inflationAdjusted = e.target.checked;
                                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                                        }}
                                                        className="form-checkbox h-5 w-5 text-black"
                                                    />
                                                    <span className="ml-2 text-gray-700">Adjust for Inflation</span>
                                                </label>
                                            </div>
                                            {formData.forIndividual === false && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Percentage Associated with User (%)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        max="100"
                                                        value={event.userPercentage || '100'}
                                                        onChange={(e) => {
                                                            const newEventSeries = [...formData.eventSeries];
                                                            newEventSeries[index].userPercentage = e.target.value;
                                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                                        }}
                                                        className={`${getInputClassName(`eventSeries.${index}.userPercentage`)} text-black`}
                                                        placeholder="100"
                                                    />
                                                    {errors[`eventSeries.${index}.userPercentage`] && (
                                                        <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.userPercentage`]}</p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {(event.type === 'invest' || event.type === 'rebalance') && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Allocation Type</label>
                                                <select
                                                    value={event.allocationType || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].allocationType = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.allocationType`)} text-black`}
                                                >
                                                    <option value="">Select allocation type...</option>
                                                    <option value="fixed">Fixed Percentage</option>
                                                    <option value="glide">Linear Glide Path</option>
                                                </select>
                                                {errors[`eventSeries.${index}.allocationType`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.allocationType`]}</p>
                                                )}
                                            </div>

                                            {event.allocationType && (
                                                event.allocationType === 'fixed' ? (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Allocations (%)</label>
                                                        {formData.assetTypes?.filter(asset => 
                                                            // Only show non-pre-tax assets
                                                            !formData.investments?.some(inv => 
                                                                inv.assetType === asset.name && 
                                                                inv.taxStatus === 'pre-tax'
                                                            )
                                                        ).map((asset, assetIndex) => (
                                                            <div key={assetIndex} className="flex items-center gap-2 mb-2">
                                                                <span className="text-sm text-gray-600 w-32">{asset.name}:</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="100"
                                                                    value={event.allocations?.[asset.name] || '0'}
                                                                    onChange={(e) => {
                                                                        const newEventSeries = [...formData.eventSeries];
                                                                        if (!newEventSeries[index].allocations) {
                                                                            newEventSeries[index].allocations = {};
                                                                        }
                                                                        newEventSeries[index].allocations[asset.name] = e.target.value;
                                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                                    }}
                                                                    className={`${getInputClassName(`eventSeries.${index}.allocations.${asset.name}`)} text-black`}
                                                                    placeholder="0"
                                                                />
                                                                <span className="text-sm text-gray-600">%</span>
                                                            </div>
                                                        ))}
                                                        {errors[`eventSeries.${index}.allocations`] && (
                                                            <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.allocations`]}</p>
                                                        )}
                                                    </div>
                                                ) : event.allocationType === 'glide' ? (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Allocations (%)</label>
                                                            {formData.assetTypes?.filter(asset => 
                                                                // Only show non-pre-tax assets
                                                                !formData.investments?.some(inv => 
                                                                    inv.assetType === asset.name && 
                                                                    inv.taxStatus === 'pre-tax'
                                                                )
                                                            ).map((asset, assetIndex) => (
                                                                <div key={assetIndex} className="flex items-center gap-2 mb-2">
                                                                    <span className="text-sm text-gray-600 w-32">{asset.name}:</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        max="100"
                                                                        value={event.initialAllocations?.[asset.name] || '0'}
                                                                        onChange={(e) => {
                                                                            const newEventSeries = [...formData.eventSeries];
                                                                            if (!newEventSeries[index].initialAllocations) {
                                                                                newEventSeries[index].initialAllocations = {};
                                                                            }
                                                                            newEventSeries[index].initialAllocations[asset.name] = e.target.value;
                                                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                                                        }}
                                                                        className={`${getInputClassName(`eventSeries.${index}.initialAllocations.${asset.name}`)} text-black`}
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="text-sm text-gray-600">%</span>
                                                                </div>
                                                            ))}
                                                            {errors[`eventSeries.${index}.initialAllocations`] && (
                                                                <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.initialAllocations`]}</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Final Allocations (%)</label>
                                                            {formData.assetTypes?.filter(asset => 
                                                                // Only show non-pre-tax assets
                                                                !formData.investments?.some(inv => 
                                                                    inv.assetType === asset.name && 
                                                                    inv.taxStatus === 'pre-tax'
                                                                )
                                                            ).map((asset, assetIndex) => (
                                                                <div key={assetIndex} className="flex items-center gap-2 mb-2">
                                                                    <span className="text-sm text-gray-600 w-32">{asset.name}:</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        max="100"
                                                                        value={event.finalAllocations?.[asset.name] || '0'}
                                                                        onChange={(e) => {
                                                                            const newEventSeries = [...formData.eventSeries];
                                                                            if (!newEventSeries[index].finalAllocations) {
                                                                                newEventSeries[index].finalAllocations = {};
                                                                            }
                                                                            newEventSeries[index].finalAllocations[asset.name] = e.target.value;
                                                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                                                        }}
                                                                        className={`${getInputClassName(`eventSeries.${index}.finalAllocations.${asset.name}`)} text-black`}
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="text-sm text-gray-600">%</span>
                                                                </div>
                                                            ))}
                                                            {errors[`eventSeries.${index}.finalAllocations`] && (
                                                                <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.finalAllocations`]}</p>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : null
                                            )}

                                            {event.type === 'invest' && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Cash Value ($)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={event.maxCashValue || ''}
                                                            onChange={(e) => {
                                                                const newEventSeries = [...formData.eventSeries];
                                                                newEventSeries[index].maxCashValue = e.target.value;
                                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                                            }}
                                                            className={`${getInputClassName(`eventSeries.${index}.maxCashValue`)} text-black`}
                                                            placeholder="Optional"
                                                        />
                                                        {errors[`eventSeries.${index}.maxCashValue`] && (
                                                            <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.maxCashValue`]}</p>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newEventSeries = formData.eventSeries.filter((_, i) => i !== index);
                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                        }}
                                        className="p-2 text-red-500 hover:text-red-700"
                                    >
                                        Remove Event
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => {
                                const eventSeries = formData.eventSeries || [];
                                setFormData({
                                    ...formData,
                                    eventSeries: [...eventSeries, {
                                        name: '',
                                        description: '',
                                        startYearType: '',
                                        durationMean: '',
                                        durationStd: '',
                                        type: ''
                                    }]
                                });
                            }}
                            className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            + Add Event
                        </button>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Strategies" isActive={currentStep === 5} errors={errors}>
                <div className="space-y-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Assumption</label>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={formData.inflationAssumption}
                                    onChange={(e) => {
                                        setFormData({
                                            ...formData,
                                            inflationAssumption: e.target.value,
                                            inflation: e.target.value === 'fixed' ? formData.inflation : null,
                                            inflationMin: e.target.value === 'uniform' ? formData.inflationMin : null,
                                            inflationMax: e.target.value === 'uniform' ? formData.inflationMax : null,
                                            inflationMean: e.target.value === 'normal' ? formData.inflationMean : null,
                                            inflationStd: e.target.value === 'normal' ? formData.inflationStd : null
                                        });
                                    }}
                                    className={`${getInputClassName('inflationAssumption')} text-black`}
                                >
                                    <option value="fixed">Fixed Percentage</option>
                                    <option value="uniform">Uniform Distribution</option>
                                    <option value="normal">Normal Distribution</option>
                                </select>
                            </div>

                            {formData.inflationAssumption === 'fixed' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Inflation Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.inflation || ''}
                                        onChange={(e) => {
                                            setFormData({ ...formData, inflation: e.target.value });
                                        }}
                                        className={`${getInputClassName('inflation')} text-black`}
                                        placeholder="2.0"
                                    />
                                </div>
                            )}

                            {formData.inflationAssumption === 'uniform' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.inflationMin || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, inflationMin: e.target.value });
                                            }}
                                            className={`${getInputClassName('inflationMin')} text-black`}
                                            placeholder="1.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.inflationMax || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, inflationMax: e.target.value });
                                            }}
                                            className={`${getInputClassName('inflationMax')} text-black`}
                                            placeholder="3.0"
                                        />
                                    </div>
                                </>
                            )}

                            {formData.inflationAssumption === 'normal' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mean Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.inflationMean || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, inflationMean: e.target.value });
                                            }}
                                            className={`${getInputClassName('inflationMean')} text-black`}
                                            placeholder="2.0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Standard Deviation (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.inflationStd || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, inflationStd: e.target.value });
                                            }}
                                            className={`${getInputClassName('inflationStd')} text-black`}
                                            placeholder="0.5"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Bracket Optimization</label>
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.enableTaxOptimization}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                enableTaxOptimization: e.target.checked,
                                                rothOptimizationStartYear: e.target.checked ? formData.rothOptimizationStartYear : null,
                                                rothOptimizationEndYear: e.target.checked ? formData.rothOptimizationEndYear : null
                                            });
                                        }}
                                        className="form-checkbox h-5 w-5 text-black"
                                    />
                                    <span className="ml-2 text-gray-700">Enable Tax Bracket Optimization</span>
                                </label>
                            </div>

                            {formData.enableTaxOptimization && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label>
                                        <input
                                            type="number"
                                            value={formData.rothOptimizationStartYear || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, rothOptimizationStartYear: e.target.value });
                                            }}
                                            className={`${getInputClassName('rothOptimizationStartYear')} text-black`}
                                            placeholder="2024"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Year</label>
                                        <input
                                            type="number"
                                            value={formData.rothOptimizationEndYear || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, rothOptimizationEndYear: e.target.value });
                                            }}
                                            className={`${getInputClassName('rothOptimizationEndYear')} text-black`}
                                            placeholder="2030"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Withdrawal Strategy</label>
                        <p className="text-sm text-gray-500 mb-2">Order your investments for withdrawal (drag to reorder)</p>
                        <div className="space-y-2">
                            {formData.investments?.map((investment, index) => (
                                <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500">⋮⋮</span>
                                    <span className="flex-1 text-gray-500">{investment.assetType} ({investment.taxStatus})</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={investment.withdrawalOrder || index + 1}
                                        onChange={(e) => {
                                            const newInvestments = [...formData.investments];
                                            newInvestments[index].withdrawalOrder = parseInt(e.target.value);
                                            setFormData({ ...formData, investments: newInvestments });
                                        }}
                                        className="w-20 p-1 border rounded"
                                        placeholder="Order"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roth Conversion Strategy</label>
                        <p className="text-sm text-gray-500 mb-2">Order your pre-tax investments for Roth conversion (drag to reorder)</p>
                        <div className="space-y-2">
                            {formData.investments
                                ?.filter(inv => inv.taxStatus === 'pre-tax')
                                .map((investment, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                        <span className="text-gray-500">⋮⋮</span>
                                        <span className="flex-1 text-gray-500">{investment.assetType}</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={investment.rothConversionOrder || index + 1}
                                            onChange={(e) => {
                                                const newInvestments = [...formData.investments];
                                                const investmentIndex = newInvestments.findIndex(inv => inv.assetType === investment.assetType);
                                                newInvestments[investmentIndex].rothConversionOrder = parseInt(e.target.value);
                                                setFormData({ ...formData, investments: newInvestments });
                                            }}
                                            className="w-20 p-1 border rounded"
                                            placeholder="Order"
                                        />
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </FormSection>

            <div className="flex justify-between mt-8">
                <button
                    onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
                    className={`px-6 py-2 rounded-md ${currentStep === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover: cursor-pointer'
                        }`}
                    disabled={currentStep === 1}
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    className="px-6 py-2 rounded-md bg-black text-white hover:bg-gray-800 hover: cursor-pointer"
                >
                    {currentStep === 5 ? 'Create' : 'Next'}
                </button>
            </div>
        </motion.div>
    );
};

const ScenarioPage = () => {
    const [scenarios, setScenarios] = useState([]);
    const [isCreating, setIsCreating] = useState(false);

    const handleScenarioCreate = (newScenario) => {
        setScenarios([...scenarios, newScenario]);
        setIsCreating(false);
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8"
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-black text-3xl font-bold">
                    {isCreating ? 'Create New Scenario' : 'Your Scenarios'}
                </h1>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-6 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                    >
                        Create New Scenario
                    </button>
                )}
            </div>

            {isCreating && (
                <CreateScenarioForm
                    onScenarioCreate={handleScenarioCreate}
                    onCancel={() => setIsCreating(false)}
                />
            )}

            {scenarios.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenarios.map((scenario, index) => (
                        <ScenarioCard key={index} scenario={scenario} />
                    ))}
                </div>
            ) : !isCreating && (
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-gray-500 text-lg">
                        You haven't created any scenarios yet. Create your first scenario
                    </p>
                </div>
            )}
        </motion.div>
    );
};

export default ScenarioPage; 