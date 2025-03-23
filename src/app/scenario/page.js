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

const ScenarioCard = ({ scenario }) => (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <h3 className="text-xl font-semibold mb-2">{scenario.name}'s Scenario</h3>
        <div className="space-y-2 text-gray-600">
            <p>Type: {scenario.type}</p>
            <p>Birth Year: {scenario.birthYear}</p>
            <p>Life Expectancy: {scenario.lifeExpectancy} years</p>
            <p>Life Expectancy Standard Deviation: {scenario.lifeExpectancyStd} years</p>
            {scenario.type === 'Married Couple' && (
                <>
                    <p>Spouse Birth Year: {scenario.spouseBirthYear}</p>
                    <p>Spouse Life Expectancy: {scenario.spouseLifeExpectancy} years</p>
                    <p>Spouse Life Expectancy Standard Deviation: {scenario.spouseLifeExpectancyStd} years</p>
                </>
            )}
            <div className="pt-4">
                <p className="font-medium">Financial Details</p>
                <p>Current Savings: ${scenario.currentSavings}</p>
                <p>Monthly Contribution: ${scenario.monthlyContribution}</p>
                <p>Risk Tolerance: {scenario.riskTolerance}</p>
                <p>Investment: {scenario.investmentPreference}</p>
            </div>
            <div className="pt-4">
                <p className="font-medium">Strategies</p>
                <p>Inflation Assumption: {scenario.inflationAssumption}</p>
                {scenario.inflationAssumption === 'fixed' && (
                    <p>Fixed Rate: {scenario.inflation}%</p>
                )}
                {scenario.inflationAssumption === 'uniform' && (
                    <p>Range: {scenario.inflationMin}% - {scenario.inflationMax}%</p>
                )}
                {scenario.inflationAssumption === 'normal' && (
                    <p>Mean: {scenario.inflationMean}%, Std Dev: {scenario.inflationStd}%</p>
                )}
                <p>Tax Optimization: {scenario.enableTaxOptimization ? 'Enabled' : 'Disabled'}</p>
                {scenario.enableTaxOptimization && (
                    <p>Optimization Period: {scenario.taxOptimizationStartYear} - {scenario.taxOptimizationEndYear}</p>
                )}
                <div className="mt-2">
                    <p className="font-medium">Withdrawal Strategy:</p>
                    {scenario.investments
                        ?.sort((a, b) => (a.withdrawalOrder || 0) - (b.withdrawalOrder || 0))
                        .map((investment, index) => (
                            <p key={index} className="ml-4">
                                {index + 1}. {investment.assetType} ({investment.taxStatus})
                            </p>
                        ))}
                </div>
                <div className="mt-2">
                    <p className="font-medium">Roth Conversion Strategy:</p>
                    {scenario.investments
                        ?.filter(inv => inv.taxStatus === 'pre-tax')
                        .sort((a, b) => (a.rothConversionOrder || 0) - (b.rothConversionOrder || 0))
                        .map((investment, index) => (
                            <p key={index} className="ml-4">
                                {index + 1}. {investment.assetType}
                            </p>
                        ))}
                </div>
            </div>
        </div>
    </div>
);

const CreateScenarioForm = ({ onScenarioCreate, onCancel }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        birthYear: '',
        lifeExpectancy: '',
        lifeExpectancyStd: '0',
        spouseBirthYear: '',
        spouseLifeExpectancy: '',
        spouseLifeExpectancyStd: '0',
        retirementAge: '',
        spouseRetirementAge: '',
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
        enableTaxOptimization: false,
        taxOptimizationStartYear: '',
        taxOptimizationEndYear: ''
    });
    const [errors, setErrors] = useState({});

    const validateStep = (step) => {
        const newErrors = {};
        switch (step) {
            case 1:
                if (!formData.name) newErrors.name = 'Name is required';
                if (!formData.type) newErrors.type = 'Please select a type';
                if (!formData.birthYear) newErrors.birthYear = 'Birth year is required';
                if (!formData.lifeExpectancy) newErrors.lifeExpectancy = 'Life expectancy is required';
                if (!formData.lifeExpectancyStd) newErrors.lifeExpectancyStd = 'Life expectancy standard deviation is required';
                if (formData.type === 'Married Couple') {
                    if (!formData.spouseBirthYear) newErrors.spouseBirthYear = 'Spouse birth year is required';
                    if (!formData.spouseLifeExpectancy) newErrors.spouseLifeExpectancy = 'Spouse life expectancy is required';
                    if (!formData.spouseLifeExpectancyStd) newErrors.spouseLifeExpectancyStd = 'Spouse life expectancy standard deviation is required';
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
                    if (!event.durationMean || isNaN(event.durationMean) || parseFloat(event.durationMean) <= 0) {
                        newErrors[`eventSeries.${index}.durationMean`] = 'Duration mean must be a positive number';
                    }
                    if (!event.durationStd || isNaN(event.durationStd) || parseFloat(event.durationStd) < 0) {
                        newErrors[`eventSeries.${index}.durationStd`] = 'Duration standard deviation must be a non-negative number';
                    }
                    
                    // Validate event-specific fields
                    if (event.type === 'income' || event.type === 'expense') {
                        if (!event.amount || isNaN(event.amount) || parseFloat(event.amount) <= 0) {
                            newErrors[`eventSeries.${index}.amount`] = 'Amount must be a positive number';
                        }
                        
                        // Validate user percentage for married couples
                        if (formData.type === 'Married Couple' && (!event.userPercentage || isNaN(event.userPercentage) || 
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
                                // Check if allocations sum to 100%
                                const sum = Object.values(event.allocations)
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
                                const initialSum = Object.values(event.initialAllocations)
                                    .reduce((acc, val) => acc + parseFloat(val || 0), 0);
                                if (Math.abs(initialSum - 100) > 0.1) {
                                    newErrors[`eventSeries.${index}.initialAllocations`] = 'Initial allocations must sum to 100%';
                                }
                            }
                            
                            if (!event.finalAllocations || Object.keys(event.finalAllocations).length === 0) {
                                newErrors[`eventSeries.${index}.finalAllocations`] = 'Final allocations are required';
                            } else {
                                const finalSum = Object.values(event.finalAllocations)
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

                // Validate tax optimization if enabled
                if (formData.enableTaxOptimization) {
                    if (!formData.taxOptimizationStartYear || !formData.taxOptimizationEndYear || 
                        isNaN(formData.taxOptimizationStartYear) || isNaN(formData.taxOptimizationEndYear) || 
                        parseInt(formData.taxOptimizationStartYear) < 0 || parseInt(formData.taxOptimizationEndYear) < parseInt(formData.taxOptimizationStartYear)) {
                        newErrors.taxOptimizationStartYear = 'Valid tax optimization year range is required';
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
                // Create scenario
                onScenarioCreate({ ...formData });
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
                    className="text-gray-500 hover:text-gray-700"
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
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className={`${getInputClassName('type')} text-black`}
                        >
                            <option value="">Select...</option>
                            <option value="Individual">Individual</option>
                            <option value="Married Couple">Married Couple</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Birth Year</label>
                        <input
                            type="number"
                            name="birthYear"
                            value={formData.birthYear}
                            onChange={handleInputChange}
                            className={`${getInputClassName('birthYear')} text-black`}
                            placeholder="Ex: 1990"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Life Expectancy (years)</label>
                        <input
                            type="number"
                            name="lifeExpectancy"
                            value={formData.lifeExpectancy}
                            onChange={handleInputChange}
                            className={`${getInputClassName('lifeExpectancy')} text-black`}
                            placeholder="Ex: 90"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Life Expectancy Standard Deviation (years)</label>
                        <input
                            type="number"
                            name="lifeExpectancyStd"
                            value={formData.lifeExpectancyStd}
                            onChange={handleInputChange}
                            className={`${getInputClassName('lifeExpectancyStd')} text-black`}
                            placeholder="90"
                        />
                    </div>
                    {formData.type === 'Married Couple' && (<>
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
                                name="spouseLifeExpectancy"
                                value={formData.spouseLifeExpectancy}
                                onChange={handleInputChange}
                                className={`${getInputClassName('spouseLifeExpectancy')} text-black`}
                                placeholder="90"
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
                                placeholder="90"
                            />
                        </div>
                    </>)}
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
                                            value={event.durationType || 'normal'}
                                            onChange={(e) => {
                                                const newEventSeries = [...formData.eventSeries];
                                                newEventSeries[index].durationType = e.target.value;
                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                            }}
                                            className={`${getInputClassName(`eventSeries.${index}.durationType`)} text-black`}
                                        >
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
                                                {errors[`eventSeries.${index}.durationMax`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.durationMax`]}</p>
                                                )}
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
                                                {errors[`eventSeries.${index}.durationStd`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.durationStd`]}</p>
                                                )}
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
                                                    value={event.amountMean || ''}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].amountMean = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.amountMean`)} text-black`}
                                                    placeholder="10000"
                                                />
                                                {errors[`eventSeries.${index}.amountMean`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.amountMean`]}</p>
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
                                            {formData.type === 'Married Couple' && (
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
                                                    value={event.allocationType || 'fixed'}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].allocationType = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.allocationType`)} text-black`}
                                                >
                                                    <option value="fixed">Fixed Percentage</option>
                                                    <option value="glide">Linear Glide Path</option>
                                                </select>
                                                {errors[`eventSeries.${index}.allocationType`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.allocationType`]}</p>
                                                )}
                                            </div>

                                            {event.allocationType === 'fixed' ? (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Allocations (%)</label>
                                                    {formData.assetTypes?.map((asset, assetIndex) => (
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
                                            ) : (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Initial Allocations (%)</label>
                                                        {formData.assetTypes?.map((asset, assetIndex) => (
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
                                                        {formData.assetTypes?.map((asset, assetIndex) => (
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
                                                taxOptimizationStartYear: e.target.checked ? formData.taxOptimizationStartYear : null,
                                                taxOptimizationEndYear: e.target.checked ? formData.taxOptimizationEndYear : null
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
                                            value={formData.taxOptimizationStartYear || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, taxOptimizationStartYear: e.target.value });
                                            }}
                                            className={`${getInputClassName('taxOptimizationStartYear')} text-black`}
                                            placeholder="2024"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Year</label>
                                        <input
                                            type="number"
                                            value={formData.taxOptimizationEndYear || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, taxOptimizationEndYear: e.target.value });
                                            }}
                                            className={`${getInputClassName('taxOptimizationEndYear')} text-black`}
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