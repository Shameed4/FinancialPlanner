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

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef, ReactNode, ChangeEventHandler } from 'react';
import Link from 'next/link';
import { jsonToYaml, yamlToJson, validateScenario } from '@/utils/scenarioConverter';
import pageVariants from "../components/PageAnimation";
import ShareScenarioModal from './ShareScenarioModal';
import ScenarioCard from './ScenarioCard.js';
import { ExpenseEvent, StringScenarioFormData } from './types';

const FormSection = ({ title, children, isActive, errors = {} }: { title: string, children: ReactNode, isActive: boolean, errors: any }) => {
    if (!isActive) return null;

    const hasErrors = Object.keys(errors).length > 0;
    console.log(JSON.stringify(errors));

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

const CreateScenarioForm = ({ onScenarioCreate, onCancel, initialData = null }: { onScenarioCreate: (data: StringScenarioFormData) => void, onCancel: () => void, initialData: StringScenarioFormData | null }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<StringScenarioFormData>(() => {
        if (initialData) {
            return {
                ...initialData,
                assetTypes: initialData.assetTypes,
                investments: initialData.investments,
                eventSeries: initialData.eventSeries || [],
                userBirthYear: initialData.userBirthYear?.toString() || '',
                userLifeExpectancyMean: initialData.userLifeExpectancyMean?.toString() || '',
                userLifeExpectancyStd: initialData.userLifeExpectancyStd?.toString() || '',
                spouseBirthYear: initialData.spouseBirthYear?.toString(),
                spouseLifeExpectancyMean: initialData.spouseLifeExpectancyMean?.toString(),
                spouseLifeExpectancyStd: initialData.spouseLifeExpectancyStd?.toString() || '',
                financialGoal: initialData.financialGoal?.toString() || '',
                initialAfterTaxRetirementContributionLimit:
                    initialData.initialAfterTaxRetirementContributionLimit?.toString() || '',
                inflationAssumption: initialData.inflationAssumption || 'fixed',
                inflation: initialData.inflation?.toString(),
                inflationMin: initialData.inflationMin?.toString(),
                inflationMax: initialData.inflationMax?.toString(),
                inflationMean: initialData.inflationMean?.toString(),
                inflationStd: initialData.inflationStd?.toString(),
                enableTaxOptimization: Boolean(initialData.rothOptimizationStartYear),
                forIndividual: Boolean(initialData.forIndividual),
                rothOptimizationStartYear: initialData.rothOptimizationStartYear?.toString(),
                rothOptimizationEndYear: initialData.rothOptimizationEndYear?.toString()
            };
        }

        // Default values if no initialData
        return {
            name: '',
            forIndividual: true,
            userBirthYear: '',
            userLifeExpectancyMean: '',
            userLifeExpectancyStd: '0',
            spouseBirthYear: '',
            spouseLifeExpectancyMean: '',
            spouseLifeExpectancyStd: '0',
            assetTypes: [{ name: "Cash", description: "Pre-defined", returnType: "fixed", expenseRatio: "", incomeAmtOrPct: "amount", returnAmtOrPct: "amount" }],
            investments: [{ assetType: "Cash", value: "0", taxStatus: "non-retirement", rothConversionStrategy: "1" }],
            eventSeries: [],
            inflationAssumption: '',
            residenceState: '',
            financialGoal: '',
            initialAfterTaxRetirementContributionLimit: '',
            enableTaxOptimization: false,
            rothOptimizationStartYear: '',
            rothOptimizationEndYear: ''
        };
    });
    const [errors, setErrors] = useState<any>({});

    const validateStep = (step: number) => {
        const newErrors: Record<string, string> = {};
        console.log(JSON.stringify(formData));
        switch (step) {
            case 1:
                if (!formData.name) newErrors.name = 'Name is required';
                if (!formData.userBirthYear) newErrors.userBirthYear = 'Birth year is required';
                if (!formData.userLifeExpectancyMean) newErrors.userLifeExpectancyMean = 'Life expectancy is required';
                if (!formData.userLifeExpectancyStd) newErrors.userLifeExpectancyStd = 'Life expectancy standard deviation is required';
                if (!formData.residenceState) newErrors.residenceState = 'Residence state is required';
                if (!formData.financialGoal) newErrors.financialGoal = 'Financial goal is required';
                if (formData.financialGoal && (isNaN(Number(formData.financialGoal)) || parseFloat(formData.financialGoal) < 0)) {
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
                            if (!formData.inflation || isNaN(Number(formData.inflation)) || parseFloat(formData.inflation) < 0) {
                                newErrors.inflation = 'Valid fixed inflation rate is required';
                            }
                            break;
                        case 'random_uniform':
                            if (!formData.inflationMin || !formData.inflationMax ||
                                isNaN(Number(formData.inflationMin)) || isNaN(Number(formData.inflationMax)) ||
                                parseFloat(formData.inflationMin) < 0 || parseFloat(formData.inflationMax) < parseFloat(formData.inflationMin)) {
                                newErrors.inflationMin = 'Valid uniform distribution range is required';
                            }
                            break;
                        case 'random_normal':
                            if (!formData.inflationMean || !formData.inflationStd ||
                                isNaN(Number(formData.inflationMean)) || isNaN(Number(formData.inflationStd)) ||
                                parseFloat(formData.inflationMean) < 0 || parseFloat(formData.inflationStd) <= 0) {
                                newErrors.inflationMean = 'Valid normal distribution parameters are required';
                            }
                            break;
                    }
                }
                // Validate initial after tax retirement contribution limit
                if (!formData.initialAfterTaxRetirementContributionLimit) {
                    newErrors.initialAfterTaxRetirementContributionLimit = 'Initial after tax retirement contribution limit is required';
                } else if (isNaN(Number(formData.initialAfterTaxRetirementContributionLimit)) || parseFloat(formData.initialAfterTaxRetirementContributionLimit) < 0) {
                    newErrors.initialAfterTaxRetirementContributionLimit = 'Initial after tax retirement contribution limit must be a non-negative number';
                }
                break;
            case 2:
                formData.assetTypes?.forEach((asset, index) => {
                    if (!asset.name) newErrors[`assetTypes.${index}.name`] = 'Asset name is required';
                    if (!asset.description) newErrors[`assetTypes.${index}.description`] = 'Description is required';
                    if (!asset.returnType) newErrors[`assetTypes.${index}.returnType`] = 'Return type is required';

                    // Validate return fields based on return type
                    if (asset.returnType === 'fixed') {
                        if (!asset.fixedReturn) newErrors[`assetTypes.${index}.fixedReturn`] = 'Fixed return is required';
                        if (asset.fixedReturn && isNaN(Number(asset.fixedReturn))) {
                            newErrors[`assetTypes.${index}.fixedReturn`] = 'Fixed return must be a number';
                        }
                    } else {
                        if (!asset.normalReturnMean) newErrors[`assetTypes.${index}.normalReturnMean`] = 'Expected return mean is required';
                        if (!asset.normalReturnStd) newErrors[`assetTypes.${index}.normalReturnStd`] = 'Return standard deviation is required';
                        if (asset.normalReturnMean && isNaN(Number(asset.normalReturnMean))) {
                            newErrors[`assetTypes.${index}.normalReturnMean`] = 'Expected return mean must be a number';
                        }
                        if (asset.normalReturnStd && (isNaN(Number(asset.normalReturnStd)) || parseFloat(asset.normalReturnStd) < 0)) {
                            newErrors[`assetTypes.${index}.normalReturnStd`] = 'Return standard deviation must be a non-negative number';
                        }
                    }

                    if (!asset.expenseRatio) newErrors[`assetTypes.${index}.expenseRatio`] = 'Expense ratio is required';
                    if (!asset.normalIncomeMean) newErrors[`assetTypes.${index}.normalIncomeMean`] = 'Income mean is required';
                });
                break;
            case 3:
                formData.investments.forEach((investment, index) => {
                    if (!investment.assetType) newErrors[`investments.${index}.assetType`] = 'Asset type is required';
                    if (investment.value === "") {
                        console.log(investment.value);
                        newErrors[`investments.${index}.value`] = 'Value is required';
                    }
                    if (!investment.taxStatus) newErrors[`investments.${index}.taxStatus`] = 'Tax status is required';

                    // Validate that the selected asset type exists
                    if (investment.assetType && !formData.assetTypes?.some(asset => asset.name === investment.assetType)) {
                        newErrors[`investments.${index}.assetType`] = 'Selected asset type does not exist';
                    }

                    // Validate that value is a positive number
                    if (investment.value && (isNaN(Number(investment.value)) || parseFloat(investment.value) < 0)) {
                        newErrors[`investments.${index}.value`] = 'Value must be a non-negative number';
                    }
                });
                break;
            case 4:
                formData.eventSeries?.forEach((event, index) => {
                    if (!event.name) newErrors[`eventSeries.${index}.name`] = 'Event name is required';
                    if (!event.type) newErrors[`eventSeries.${index}.type`] = 'Event type is required';
                    if (!event.startYearType) newErrors[`eventSeries.${index}.startYearType`] = 'Start year type is required';

                    // Validate start year based on type
                    if (event.startYearType === 'fixed' && (!event.startYear || isNaN(Number(event.startYear)))) {
                        newErrors[`eventSeries.${index}.startYear`] = 'Start year is required';
                    } else if (event.startYearType === 'relative' && (!event.relativeStartYear || isNaN(Number(event.relativeStartYear)))) {
                        newErrors[`eventSeries.${index}.relativeStartYear`] = 'Relative start year is required';
                    }

                    // Validate duration
                    if (!event.durationType) {
                        newErrors[`eventSeries.${index}.durationType`] = 'Duration type is required';
                    } else {
                        switch (event.durationType) {
                            case 'fixed':
                                if (!event.durationFixed || isNaN(Number(event.durationFixed)) || parseFloat(event.durationFixed) <= 0) {
                                    newErrors[`eventSeries.${index}.durationFixed`] = 'Duration must be a positive number';
                                }
                                break;
                            case 'random_uniform':
                                if (!event.durationMin || !event.durationMax ||
                                    isNaN(Number(event.durationMin)) || isNaN(Number(event.durationMax)) ||
                                    parseFloat(event.durationMin) <= 0 || parseFloat(event.durationMax) < parseFloat(event.durationMin)) {
                                    newErrors[`eventSeries.${index}.durationMin`] = 'Invalid uniform duration range';
                                }
                                break;
                            case 'random_normal':
                                if (!event.durationMean || !event.durationStd ||
                                    isNaN(Number(event.durationMean)) || isNaN(Number(event.durationStd)) ||
                                    parseFloat(event.durationMean) <= 0 || parseFloat(event.durationStd) < 0) {
                                    newErrors[`eventSeries.${index}.durationMean`] = 'Invalid normal duration parameters';
                                }
                                break;
                        }
                    }

                    // Validate event-specific fields
                    if (event.type === 'income' || event.type === 'expense') {
                        if (!event.amount || isNaN(Number(event.amount)) || parseFloat(event.amount) < 0) {
                            newErrors[`eventSeries.${index}.amount`] = 'Amount must be a non-negative number';
                        }

                        // Validate user percentage for married couples
                        if (formData.forIndividual === false && (!event.userPercentage || isNaN(Number(event.userPercentage)) ||
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
                                const filteredAllocations: Record<string, string> = {};
                                Object.entries(event.allocations).forEach(([assetName, percentage]) => {
                                    // Check if this asset type exists in any pre-tax investment
                                    const isPreTax = formData.investments?.every(
                                        inv => inv.assetType === assetName && inv.taxStatus === 'pre-tax-retirement'
                                    );
                                    if (!isPreTax) {
                                        filteredAllocations[assetName] = percentage;
                                    }
                                });

                                // Check if allocations sum to 100%
                                const sum = Object.values(filteredAllocations)
                                    .reduce((acc, val) => acc + parseFloat(val || "0"), 0);
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
                                const filteredInitialAllocations: Record<string, string> = {};
                                Object.entries(event.initialAllocations).forEach(([assetName, percentage]) => {
                                    // Check if this asset type exists in any pre-tax investment
                                    const isPreTax = formData.investments?.every(
                                        inv => inv.assetType === assetName && inv.taxStatus === 'pre-tax-retirement'
                                    );
                                    if (!isPreTax) {
                                        filteredInitialAllocations[assetName] = percentage;
                                    }
                                });

                                const initialSum = Object.values(filteredInitialAllocations)
                                    .reduce((acc, val) => acc + parseFloat(val || "0"), 0);
                                if (Math.abs(initialSum - 100) > 0.1) {
                                    newErrors[`eventSeries.${index}.initialAllocations`] = 'Initial allocations must sum to 100%';
                                }
                            }

                            if (!event.finalAllocations || Object.keys(event.finalAllocations).length === 0) {
                                newErrors[`eventSeries.${index}.finalAllocations`] = 'Final allocations are required';
                            } else {
                                // Filter out allocations for pre-tax investments
                                const filteredFinalAllocations: Record<string, string> = {};
                                Object.entries(event.finalAllocations).forEach(([assetName, percentage]) => {
                                    // Check if this asset type exists in any pre-tax investment
                                    const isPreTax = formData.investments?.every(
                                        inv => inv.assetType === assetName && inv.taxStatus === 'pre-tax-retirement'
                                    );
                                    if (!isPreTax) {
                                        filteredFinalAllocations[assetName] = percentage;
                                    }
                                });

                                const finalSum = Object.values(filteredFinalAllocations)
                                    .reduce((acc, val) => acc + parseFloat(val || "0"), 0);
                                if (Math.abs(finalSum - 100) > 0.1) {
                                    newErrors[`eventSeries.${index}.finalAllocations`] = 'Final allocations must sum to 100%';
                                }
                            }
                        }

                        // Validate maxCashValue for invest events if provided
                        if (event.type === 'invest' && event.maxCashValue &&
                            (isNaN(Number(event.maxCashValue)) || parseFloat(event.maxCashValue) <= 0)) {
                            newErrors[`eventSeries.${index}.maxCashValue`] = 'Maximum cash value must be a positive number';
                        }
                    }
                });
                break;
            case 5:
                // Validate tax optimization if enabled
                if (formData.enableTaxOptimization) {
                    if (!formData.rothOptimizationStartYear || !formData.rothOptimizationEndYear ||
                        isNaN(Number(formData.rothOptimizationStartYear)) || isNaN(Number(formData.rothOptimizationEndYear)) ||
                        parseInt(formData.rothOptimizationStartYear) < 0 || parseInt(formData.rothOptimizationEndYear) < parseInt(formData.rothOptimizationStartYear)) {
                        newErrors.rothOptimizationStartYear = 'Valid tax optimization year range is required';
                    }
                }

                // Validate RMD strategy
                if (formData.investments?.length > 0) {
                    const rmdStrategys = formData.investments
                        .map(inv => inv.rmdStrategy)
                        .filter(order => order !== undefined && order !== null);

                    if (rmdStrategys.length > 0) {
                        const uniqueOrders = new Set(rmdStrategys);
                        if (rmdStrategys.length !== uniqueOrders.size) {
                            newErrors.rmdStrategy = 'Each investment must have a unique RMD order';
                        }
                    }
                }

                // Validate Roth conversion strategy
                const preTaxInvestments = formData.investments?.filter(inv => inv.taxStatus === 'pre-tax-retirement');
                if (preTaxInvestments?.length > 0) {
                    const conversionOrders = preTaxInvestments
                        .map(inv => inv.rothConversionStrategy)
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
                // Ensure rmdStrategy and rothConversionStrategy are properly assigned
                const processedFormData = { ...formData };

                // Normalize withdrawal orders (ensure consecutive 1-n)
                if (processedFormData.investments?.length > 0) {
                    // Create a copy with parsed integer values
                    const sortedInvestments = [...processedFormData.investments]
                        .map((inv, idx) => ({
                            ...inv,
                            originalIndex: idx,
                            rmdStrategy: inv.rmdStrategy || idx + 1
                        }))
                        .sort((a, b) => a.rmdStrategy - b.rmdStrategy);

                    // Reassign sequential orders (1, 2, 3, ...)
                    sortedInvestments.forEach((inv, idx) => {
                        processedFormData.investments[inv.originalIndex].rmdStrategy = idx + 1;
                    });

                    // Normalize Roth conversion orders for pre-tax investments
                    const preTaxInvestments = processedFormData.investments
                        .filter(inv => inv.taxStatus === 'pre-tax-retirement')
                        .map((inv, idx) => ({
                            ...inv,
                            originalIndex: processedFormData.investments.findIndex(
                                item => item.assetType === inv.assetType
                            ),
                            rothConversionStrategy: inv.rothConversionStrategy || idx
                        }))
                        .sort((a, b) => a.rothConversionStrategy - b.rothConversionStrategy);

                    // Reassign sequential orders (1, 2, 3, ...)
                    preTaxInvestments.forEach((inv, idx) => {
                        processedFormData.investments[inv.originalIndex].rothConversionStrategy = idx + 1;
                    });
                }

                // Convert specific numeric fields to numbers, preserving string fields
                const prepareFormDataForSubmission = (data: StringScenarioFormData) => {
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

                    // List of field paths that should be converted to boolean values
                    const booleanFields = [
                        'hasSpouse', 'selfEmployed', 'forIndividual'
                    ];

                    // Helper to check if a path should be numeric
                    const shouldBeNumeric = (path: string) => {
                        // Direct match for top-level fields
                        if (numericFields.includes(path)) return true;

                        // Check for array item fields
                        // Asset types - ensure all numeric fields are properly converted
                        if (path.match(/^assetTypes\.\d+\.(fixedReturn|normalReturnMean|normalReturnStd|expenseRatio|fixedIncome|normalIncomeMean|normalIncomeStd|percentage|value|fee|minAllocation|maxAllocation|targetAllocation)$/)) return true;

                        // Investments
                        if (path.match(/^investments\.\d+\.(value|rmdStrategy|rothConversionStrategy)$/)) return true;

                        // Event series
                        if (path != 'annualChangeType' && path.match(/^eventSeries\.\d+\.(startYear|startYearMin|startYearMax|startYearMean|startYearStd|durationFixed|durationMin|durationMax|durationMean|durationStd|amount|userPercentage|maxCashValue|annualChange.*)$/)) return true;

                        // Allocations percentages
                        if (path.match(/^eventSeries\.\d+\.(allocations|initialAllocations|finalAllocations)\.[^.]+$/)) return true;

                        return false;
                    };

                    // Recursive function to process the object
                    const processObject = (obj: any, path = '') => {
                        const result: any = {};

                        Object.entries(obj).forEach(([key, value]) => {
                            // Skip empty strings
                            if (value === '') return;

                            const currentPath = path ? `${path}.${key}` : key;

                            // Process arrays
                            if (Array.isArray(value)) {
                                result[key] = value.map((item, index) => {
                                    // For nested objects in arrays (like assetTypes)
                                    if (item !== null && typeof item === 'object') {
                                        // Special handling for assetTypes array items
                                        if (currentPath === 'assetTypes') {
                                            const processedItem: any = {};
                                            Object.entries(item).forEach(([itemKey, itemValue]) => {
                                                // Skip empty strings
                                                if (itemValue === '') return;

                                                // Convert all numeric fields in assetTypes to numbers
                                                if (['fixedReturn', 'normalReturnMean', 'normalReturnStd',
                                                    'expenseRatio', 'normalIncomeMean',
                                                    'normalIncomeStd', 'percentage', 'value', 'fee',
                                                    'minAllocation', 'maxAllocation', 'targetAllocation'].includes(itemKey) &&
                                                    typeof itemValue === 'string' && !isNaN(Number(itemValue))) {
                                                    processedItem[itemKey] = Number(itemValue);
                                                } else {
                                                    processedItem[itemKey] = itemValue;
                                                }
                                            });
                                            return processedItem;
                                        }
                                        return processObject(item, `${currentPath}.${index}`);
                                    }

                                    // Skip empty strings
                                    if (item === '') return null;

                                    const itemPath = `${currentPath}.${index}`;
                                    if (shouldBeNumeric(itemPath) && typeof item === 'string' && !isNaN(Number(item))) {
                                        return Number(item);
                                    }
                                    // Process boolean values in arrays
                                    if ((itemPath.includes('.taxability') ||
                                        itemPath.includes('.isSocialSecurity') ||
                                        itemPath.includes('.isDiscretionary') ||
                                        booleanFields.includes(itemPath)) &&
                                        typeof item === 'string') {
                                        if (item.toLowerCase() === 'yes' || item === 'true') {
                                            return true;
                                        } else if (item.toLowerCase() === 'no' || item === 'false') {
                                            return false;
                                        } else {
                                            return item;
                                        }
                                    }
                                    return item;
                                }).filter(item => item !== null);
                            }
                            // Process nested objects
                            else if (value !== null && typeof value === 'object') {
                                result[key] = processObject(value, currentPath);
                            }
                            // Process primitive values - Convert numeric fields
                            else if (shouldBeNumeric(currentPath) && typeof value === 'string' && !isNaN(Number(value))) {
                                result[key] = Number(value);
                            }
                            // Process boolean values - only convert specific fields to avoid affecting text descriptions
                            else if ((currentPath.includes('.taxability') ||
                                currentPath.includes('.isSocialSecurity') ||
                                currentPath.includes('.isDiscretionary') ||
                                booleanFields.includes(currentPath)) &&
                                typeof value === 'string') {
                                // Convert only checkbox-related fields
                                if (value.toLowerCase() === 'yes' || value === 'true') {
                                    result[key] = true;
                                } else if (value.toLowerCase() === 'no' || value === 'false') {
                                    result[key] = false;
                                } else {
                                    result[key] = value;
                                }
                            }
                            else {
                                result[key] = value;
                            }
                        });

                        return result;
                    };

                    return processObject(data);
                };

                const numericFormData = prepareFormDataForSubmission(processedFormData);
                console.log('Prepared data with numeric values:', numericFormData);
                onScenarioCreate(numericFormData);
            }
            setErrors({});
        } else {
            setErrors(stepErrors);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                        <div className="flex items-center mt-2">
                            <input
                                type="checkbox"
                                id="hasSpouse"
                                checked={!formData.forIndividual}
                                onChange={(e) => {
                                    setFormData({
                                        ...formData,
                                        forIndividual: !e.target.checked
                                    });
                                }}
                                className="form-checkbox h-5 w-5 text-black"
                            />
                            <label htmlFor="hasSpouse" className="ml-2 text-gray-700">
                                Married Couple (check if married)
                            </label>
                        </div>
                        {errors.forIndividual && (
                            <p className="mt-1 text-sm text-red-600">{errors.forIndividual}</p>
                        )}
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
                                            inflationAssumption: e.target.value as "fixed" | "random_uniform" | "random_normal",
                                            inflation: e.target.value === 'fixed' ? formData.inflation : undefined,
                                            inflationMin: e.target.value === 'random_uniform' ? formData.inflationMin : undefined,
                                            inflationMax: e.target.value === 'random_uniform' ? formData.inflationMax : undefined,
                                            inflationMean: e.target.value === 'random_normal' ? formData.inflationMean : undefined,
                                            inflationStd: e.target.value === 'random_normal' ? formData.inflationStd : undefined
                                        });
                                    }}
                                    className={`${getInputClassName('inflationAssumption')} text-black`}
                                >
                                    <option value="">Select an option...</option>
                                    <option value="fixed">Fixed Percentage</option>
                                    <option value="random_uniform">Uniform Distribution</option>
                                    <option value="random_normal">Normal Distribution</option>
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

                            {formData.inflationAssumption === 'random_uniform' && (
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

                            {formData.inflationAssumption === 'random_normal' && (
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
                                            disabled={index == 0}
                                        />
                                        {errors[`assetTypes.${index}.name`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.name`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Return Distribution</label>
                                        <select
                                            value={asset.returnType}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].returnType = e.target.value as "fixed" | "random_normal";
                                                // Reset return values when switching types
                                                if (e.target.value === 'fixed') {
                                                    newAssetTypes[index].fixedReturn = '';
                                                    newAssetTypes[index].normalReturnMean = undefined;
                                                    newAssetTypes[index].normalReturnStd = undefined;
                                                } else if (e.target.value === 'random_normal') {
                                                    newAssetTypes[index].fixedReturn = undefined;
                                                    newAssetTypes[index].normalReturnMean = '';
                                                    newAssetTypes[index].normalReturnStd = '';
                                                }
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.returnType`)} text-black`}
                                        >
                                            <option value="" disabled>Select Option...</option>
                                            <option value="fixed">Fixed</option>
                                            <option value="random_normal">Normal Distribution</option>
                                        </select>
                                        {errors[`assetTypes.${index}.returnType`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.returnType`]}</p>
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type Return Type</label>
                                        <select
                                            value={asset.returnAmtOrPct}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].returnAmtOrPct = e.target.value as "amount" | "percent";
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.returnAmtOrPct`)} text-black`}
                                        >
                                            {["amount", "percent"]?.map(value => (
                                                <option key={value} value={value}>
                                                    {value}
                                                </option>
                                            ))}
                                        </select>
                                        {errors[`assetTypes.${index}.returnAmtOrPct`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.returnAmtOrPct`]}</p>
                                        )}
                                    </div>
                                    {asset.returnType === 'fixed' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Annual Return</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={asset.fixedReturn || ''}
                                                onChange={(e) => {
                                                    const newAssetTypes = [...formData.assetTypes];
                                                    newAssetTypes[index].fixedReturn = e.target.value;
                                                    setFormData({ ...formData, assetTypes: newAssetTypes });
                                                }}
                                                className={`${getInputClassName(`assetTypes.${index}.fixedReturn`)} text-black`}
                                                placeholder="Ex: 7.5"
                                            />
                                            {errors[`assetTypes.${index}.fixedReturn`] && (
                                                <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.fixedReturn`]}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Annual Return Mean</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={asset.normalReturnMean || ''}
                                                    onChange={(e) => {
                                                        const newAssetTypes = [...formData.assetTypes];
                                                        newAssetTypes[index].normalReturnMean = e.target.value;
                                                        setFormData({ ...formData, assetTypes: newAssetTypes });
                                                    }}
                                                    className={`${getInputClassName(`assetTypes.${index}.normalReturnMean`)} text-black`}
                                                    placeholder="Ex: 7.5"
                                                />
                                                {errors[`assetTypes.${index}.normalReturnMean`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.normalReturnMean`]}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Return Standard Deviation</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={asset.normalReturnStd || ''}
                                                    onChange={(e) => {
                                                        const newAssetTypes = [...formData.assetTypes];
                                                        newAssetTypes[index].normalReturnStd = e.target.value;
                                                        setFormData({ ...formData, assetTypes: newAssetTypes });
                                                    }}
                                                    className={`${getInputClassName(`assetTypes.${index}.normalReturnStd`)} text-black`}
                                                    placeholder="Ex: 15.0"
                                                />
                                                {errors[`assetTypes.${index}.normalReturnStd`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.normalReturnStd`]}</p>
                                                )}
                                            </div>
                                        </>
                                    )}
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type Income Type</label>
                                        <select
                                            value={asset.incomeAmtOrPct}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].incomeAmtOrPct = e.target.value as "amount" | "percent";
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.incomeAmtOrPct`)} text-black`}
                                        >
                                            {["amount", "percent"]?.map(value => (
                                                <option key={value} value={value}>
                                                    {value}
                                                </option>
                                            ))}
                                        </select>
                                        {errors[`assetTypes.${index}.incomeAmtOrPct`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.incomeAmtOrPct`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Annual Income Mean</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={asset.normalIncomeMean || ''}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].normalIncomeMean = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.normalIncomeMean`)} text-black`}
                                            placeholder="Ex: 2.0"
                                        />
                                        {errors[`assetTypes.${index}.normalIncomeMean`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.normalIncomeMean`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Income Standard Deviation (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={asset.normalIncomeStd || ''}
                                            onChange={(e) => {
                                                const newAssetTypes = [...formData.assetTypes];
                                                newAssetTypes[index].normalIncomeStd = e.target.value;
                                                setFormData({ ...formData, assetTypes: newAssetTypes });
                                            }}
                                            className={`${getInputClassName(`assetTypes.${index}.normalIncomeStd`)} text-black`}
                                            placeholder="Ex: 0.5"
                                        />
                                        {errors[`assetTypes.${index}.normalIncomeStd`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`assetTypes.${index}.normalIncomeStd`]}</p>
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
                                    {index != 0 && (<button
                                        type="button"
                                        onClick={() => {
                                            const newAssetTypes = formData.assetTypes.filter((_, i) => i !== index);
                                            setFormData({ ...formData, assetTypes: newAssetTypes });
                                        }}
                                        className="p-2 text-red-500 hover:text-red-700"
                                    >
                                        Remove Asset
                                    </button>)}
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
                                        returnType: 'random_normal',
                                        fixedReturn: '',
                                        normalReturnMean: '',
                                        normalReturnStd: '',
                                        expenseRatio: '',
                                        incomeType: 'fixed',
                                        incomeAmtOrPct: 'amount',
                                        returnAmtOrPct: 'amount',
                                        expectedAnnualIncomeType: 'FIXED',
                                        fixedIncome: '',
                                        normalIncomeMean: '',
                                        normalIncomeStd: '',
                                        taxable: false,
                                        taxability: 'TAXABLE'
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
                                            disabled={index == 0}
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
                                            disabled={index == 0}
                                        >
                                            <option value="">Select tax status...</option>
                                            <option value="non-retirement">Non-Retirement</option>
                                            <option value="pre-tax-retirement">Pre-Tax Retirement</option>
                                            <option value="after-tax-retirement">After-Tax Retirement</option>
                                        </select>
                                        {errors[`investments.${index}.taxStatus`] && (
                                            <p className="mt-1 text-sm text-red-600">{errors[`investments.${index}.taxStatus`]}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    {index != 0 && (<button
                                        type="button"
                                        onClick={() => {
                                            const newInvestments = formData.investments.filter((_, i) => i !== index);
                                            setFormData({ ...formData, investments: newInvestments });
                                        }}
                                        className="p-2 text-red-500 hover:text-red-700"
                                    >
                                        Remove Investment
                                    </button>)}
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
                                            <option value="random_uniform">Uniform Distribution</option>
                                            <option value="random_normal">Normal Distribution</option>
                                            <option value="same_as">Start with Another Event</option>
                                            <option value="after">Start After Another Event</option>
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

                                    {event.startYearType === 'random_uniform' && (
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

                                    {event.startYearType === 'random_normal' && (
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

                                    {(event.startYearType === 'same_as' || event.startYearType === 'after') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Event</label>
                                            <select
                                                value={event.startOnOtherSeries || ''}
                                                onChange={(e) => {
                                                    const newEventSeries = [...formData.eventSeries];
                                                    newEventSeries[index].startOnOtherSeries = e.target.value;
                                                    setFormData({ ...formData, eventSeries: newEventSeries });
                                                }}
                                                className={`${getInputClassName(`eventSeries.${index}.startOnOtherSeries`)} text-black`}
                                            >
                                                <option value="">Select reference event...</option>
                                                {formData.eventSeries.map((e, i) => i !== index && (
                                                    <option key={i} value={e.name}>{e.name}</option>
                                                ))}
                                            </select>
                                            {errors[`eventSeries.${index}.startOnOtherSeries`] && (
                                                <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.startOnOtherSeries`]}</p>
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
                                            <option value="random_uniform">Uniform</option>
                                            <option value="random_normal">Normal</option>
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

                                    {event.durationType === 'random_uniform' && (
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

                                    {event.durationType === 'random_normal' && (
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
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Change Amount or Percent</label>
                                                <select
                                                    value={event.changeAmtOrPct}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].changeAmtOrPct = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName(`eventSeries.${index}.changeAmtOrPct`)} text-black`}
                                                >
                                                    <option value="fixed">Fixed Amount</option>
                                                    <option value="percent">Percentage</option>
                                                </select>
                                                {errors[`eventSeries.${index}.changeAmtOrPct`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`eventSeries.${index}.changeAmtOrPct`]}</p>
                                                )}
                                            </div>


                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Change Distribution</label>
                                                <select
                                                    value={event.annualChangeType}
                                                    onChange={(e) => {
                                                        const newEventSeries = [...formData.eventSeries];
                                                        newEventSeries[index].annualChangeType = e.target.value;
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                    }}
                                                    className={`${getInputClassName('inflationAssumption')} text-black`}
                                                >
                                                    <option value="" disabled>Select change type...</option>
                                                    <option value="fixed">Fixed</option>
                                                    <option value="random_uniform">Uniform Distribution</option>
                                                    <option value="random_normal">Normal Distribution</option>
                                                </select>
                                            </div>

                                            {event.annualChangeType === 'fixed' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Change Type</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={event.annualChange || ''}
                                                        onChange={(e) => {
                                                            const newEventSeries = [...formData.eventSeries];
                                                            newEventSeries[index].annualChange = e.target.value;
                                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                                        }}
                                                        // className={`${getInputClassName('inflation')} text-black`}
                                                        className={`border border-black text-black rounded-md p-2`}
                                                        placeholder="2.0"
                                                    />
                                                </div>
                                            )}

                                            {event.annualChangeType === 'random_uniform' && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Uniform Change Min</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={event.annualChangeMin || ''}
                                                            onChange={(e) => {
                                                                const newEventSeries = [...formData.eventSeries];
                                                                newEventSeries[index].annualChangeMin = e.target.value;
                                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                                            }}
                                                            // className={`${getInputClassName('inflation')} text-black`}
                                                            className={`border border-black text-black rounded-md p-2`}
                                                            placeholder="2.0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Uniform Change Max</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={event.annualChangeMax || ''}
                                                            onChange={(e) => {
                                                                const newEventSeries = [...formData.eventSeries];
                                                                newEventSeries[index].annualChangeMax = e.target.value;
                                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                                            }}
                                                            // className={`${getInputClassName('inflation')} text-black`}
                                                            className={`border border-black text-black rounded-md p-2`}
                                                            placeholder="2.0"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {event.annualChangeType === 'random_normal' && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Normal Change Mean</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={event.annualChangeMean || ''}
                                                            onChange={(e) => {
                                                                const newEventSeries = [...formData.eventSeries];
                                                                newEventSeries[index].annualChangeMean = e.target.value;
                                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                                            }}
                                                            // className={`${getInputClassName('inflation')} text-black`}
                                                            className={`border border-black text-black rounded-md p-2`}
                                                            placeholder="2.0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Normal Change Std</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={event.annualChangeStd || ''}
                                                            onChange={(e) => {
                                                                const newEventSeries = [...formData.eventSeries];
                                                                newEventSeries[index].annualChangeStd = e.target.value;
                                                                setFormData({ ...formData, eventSeries: newEventSeries });
                                                            }}
                                                            // className={`${getInputClassName('inflation')} text-black`}
                                                            className={`border border-black text-black rounded-md p-2`}
                                                            placeholder="2.0"
                                                        />
                                                    </div>
                                                </>
                                            )}

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
                                                        value={event.userPercentage}
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
                                                            formData.investments?.some(inv =>
                                                                inv.assetType === asset.name &&
                                                                inv.taxStatus !== 'pre-tax-retirement'
                                                            )
                                                        ).map((asset, assetIndex) => (
                                                            <div key={assetIndex} className="flex items-center gap-2 mb-2">
                                                                <span className="text-sm text-gray-600 w-32">{asset.name}:</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="100"
                                                                    value={event.allocations?.[asset.name] || ''}
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
                                                                formData.investments?.some(inv =>
                                                                    inv.assetType === asset.name &&
                                                                    inv.taxStatus !== 'pre-tax-retirement'
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
                                                                formData.investments?.some(inv =>
                                                                    inv.assetType === asset.name &&
                                                                    inv.taxStatus !== 'pre-tax-retirement'
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
                                        startOnOtherSeries: '',
                                        durationMean: '',
                                        durationStd: '',
                                        type: '',
                                        annualChangeType: 'fixed',
                                        changeAmtOrPct: 'amount',
                                        inflationAdjusted: false
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
                                            inflation: e.target.value === 'fixed' ? formData.inflation : undefined,
                                            inflationMin: e.target.value === 'random_uniform' ? formData.inflationMin : undefined,
                                            inflationMax: e.target.value === 'random_uniform' ? formData.inflationMax : undefined,
                                            inflationMean: e.target.value === 'random_normal' ? formData.inflationMean : undefined,
                                            inflationStd: e.target.value === 'random_normal' ? formData.inflationStd : undefined
                                        });
                                    }}
                                    className={`${getInputClassName('inflationAssumption')} text-black`}
                                >
                                    <option value="" disabled>Select an inflation option...</option>
                                    <option value="fixed">Fixed Percentage</option>
                                    <option value="random_uniform">Uniform Distribution</option>
                                    <option value="random_normal">Normal Distribution</option>
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

                            {formData.inflationAssumption === 'random_uniform' && (
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

                            {formData.inflationAssumption === 'random_normal' && (
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
                                                rothOptimizationStartYear: e.target.checked ? formData.rothOptimizationStartYear : undefined,
                                                rothOptimizationEndYear: e.target.checked ? formData.rothOptimizationEndYear : undefined
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">RMD</label>
                        <p className="text-sm text-gray-500 mb-2">Order your investments for RMDs (1 = first, 2 = second, etc.)</p>
                        <div className="space-y-2">
                            {formData.investments?.filter(inv => inv.taxStatus === 'pre-tax-retirement').map((investment) => {
                                const investmentIndex = formData.investments.findIndex(inv => inv.assetType === investment.assetType);

                                return (
                                    <div key={investment.assetType} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                        <span className="flex-1 text-black">
                                            {investment.assetType} ({investment.taxStatus})
                                        </span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={formData.investments?.filter(inv => inv.taxStatus === 'pre-tax-retirement').length || 1}
                                            value={investment.rmdStrategy || ""}
                                            onChange={(e) => {
                                                const newInvestments = [...formData.investments];

                                                if (e.target.value === "") {
                                                    newInvestments[investmentIndex].rmdStrategy = "";
                                                    setFormData({ ...formData, investments: newInvestments });
                                                    return;
                                                }

                                                const newOrder = parseInt(e.target.value);

                                                if (isNaN(newOrder) || newOrder < 1 || newOrder > formData.investments.filter(inv => inv.taxStatus === 'pre-tax-retirement').length) {
                                                    return;
                                                }

                                                newInvestments[investmentIndex].rmdStrategy = newOrder + "";
                                                setFormData({ ...formData, investments: newInvestments });
                                            }}
                                            className="w-20 p-1 border rounded text-black"
                                            placeholder="Order"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roth Conversion Strategy</label>
                        <p className="text-sm text-gray-500 mb-2">Order your pre-tax investments for Roth conversion (1 = first, 2 = second, etc.)</p>
                        <div className="space-y-2">
                            {formData.investments
                                ?.filter(inv => inv.taxStatus === 'pre-tax-retirement')
                                .map((investment) => {
                                    const investmentIndex = formData.investments.findIndex(inv => inv.assetType === investment.assetType);

                                    return (
                                        <div key={investment.assetType} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                            <span className="flex-1 text-gray-500">{investment.assetType}</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max={formData.investments?.filter(inv => inv.taxStatus === 'pre-tax-retirement').length || 1}
                                                value={investment.rothConversionStrategy || ''}
                                                onChange={(e) => {
                                                    const newInvestments = [...formData.investments];

                                                    if (e.target.value === '') {
                                                        newInvestments[investmentIndex].rothConversionStrategy = '';
                                                        setFormData({ ...formData, investments: newInvestments });
                                                        return;
                                                    }

                                                    const newOrder = parseInt(e.target.value);

                                                    const preTaxInvestments = newInvestments.filter(inv => inv.taxStatus === 'pre-tax-retirement');

                                                    if (isNaN(newOrder) || newOrder < 1 || newOrder > preTaxInvestments.length) {
                                                        return;
                                                    }

                                                    newInvestments[investmentIndex].rothConversionStrategy = newOrder + '';
                                                    setFormData({ ...formData, investments: newInvestments });
                                                }}
                                                className="w-20 p-1 border rounded"
                                                placeholder="Order"
                                            />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Strategy</label>
                        <p className="text-sm text-gray-500 mb-2">
                            Order your discretionary expenses (1 = first, 2 = second, etc.)
                        </p>
                        <div className="space-y-2">
                            {formData.eventSeries
                                ?.filter(es => es.type === 'expense' && es.isDiscretionary)
                                .map((es) => {
                                    const eventIndex = formData.eventSeries.findIndex(event => event.name === es.name);

                                    return (
                                        <div key={es.name} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                            <span className="flex-1 text-black">
                                                {es.name}
                                            </span>
                                            <input
                                                type="number"
                                                min="1"
                                                max={formData.eventSeries.filter(e => e.type === 'expense' && e.isDiscretionary).length || 1}
                                                value={es.expenseWithdrawalStrategy || ''}
                                                onChange={(e) => {
                                                    const newEventSeries = [...formData.eventSeries];

                                                    if (e.target.value === '') {
                                                        newEventSeries[eventIndex].expenseWithdrawalStrategy = '';
                                                        setFormData({ ...formData, eventSeries: newEventSeries });
                                                        return;
                                                    }

                                                    const newOrder = parseInt(e.target.value);
                                                    const discretionaryCount = newEventSeries.filter(e => e.type === 'expense' && e.isDiscretionary).length;

                                                    if (isNaN(newOrder) || newOrder < 1 || newOrder > discretionaryCount) {
                                                        return;
                                                    }

                                                    newEventSeries[eventIndex].expenseWithdrawalStrategy = newOrder + '';
                                                    setFormData({ ...formData, eventSeries: newEventSeries });
                                                }}
                                                className="w-20 p-1 border rounded text-black"
                                                placeholder="Order"
                                            />
                                        </div>
                                    );
                                })}
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
    const [editingScenario, setEditingScenario] = useState<StringScenarioFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<String | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: session, status } = useSession();
    const userEmail = session?.user?.email || "john.doe@email.com";

    const fetchScenarios = async () => {
        try {
            setIsLoading(true);
            // First, ensure the user exists in the database
            const createUserResponse = await fetch('/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    googleId: session?.user?.email || userEmail // fallback to email if no Google ID
                }),
            });

            // Now fetch scenarios
            const response = await fetch(`/api/scenarios?ownerId=${userEmail}`);
            const data = await response.json();

            if (data.status === 200) {
                console.log(`Setting scenarios to ${data.result}`);
                // console.log(data.result);
                setScenarios(data.result);
            } else {
                setError(data.error || 'Failed to fetch scenarios');
            }
        } catch (err) {
            setError('Failed to fetch scenarios');
            console.error('Error fetching scenarios:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userEmail) {
            fetchScenarios();
        }
    }, [userEmail, session?.user?.email]);

    const handleScenarioCreate = async (newScenario: any) => {
        try {
            setIsLoading(true);
            const scenarioData = {
                ...newScenario,
                userEmail,
                spouseBirthYear: newScenario.spouseBirthYear || null,
                spouseLifeExpectancyMean: newScenario.spouseLifeExpectancyMean || null,
                spouseLifeExpectancyStd: newScenario.spouseLifeExpectancyStd || null,
                rothOptimizationStartYear: newScenario.rothOptimizationStartYear || null,
                rothOptimizationEndYear: newScenario.rothOptimizationEndYear || null
            };

            console.log("Scenario data", scenarioData);

            const response = await fetch('/api/scenarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scenarioData),
            });

            const data = await response.json();

            if (data.status === 201) {
                await fetchScenarios();
                setIsCreating(false);
            } else {
                setError(data.error || 'Failed to create scenario');
            }
        } catch (err) {
            setError('Failed to create scenario');
            console.error('Error creating scenario:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsLoading(true);
            const reader = new FileReader();

            reader.onload = async (e) => {
                const yamlContent = e.target?.result as string;

                // Call the import API with direct save flag
                const response = await fetch('/api/scenarios/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        scenarioYaml: yamlContent,
                        userEmail: userEmail,
                        saveToDB: true  // Flag to indicate direct save to DB
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to import scenario');
                }

                const data = await response.json();

                if (data.status === 201) {
                    // Scenario was created successfully
                    await fetchScenarios();
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    setError(null);
                } else if (data.status === 400) {
                    // Validation error
                    setError(data.error || 'Invalid YAML format');
                } else {
                    setError(data.error || 'Failed to import scenario');
                }
            };

            reader.readAsText(file);
        } catch (err) {
            console.error('Error importing scenario:', err);
            setError('Failed to import scenario. Please check the file format and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleScenarioEdit = async (updatedScenario: StringScenarioFormData) => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/scenarios`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...updatedScenario,
                    userEmail
                }),
            });

            const data = await response.json();
            console.log(data.status);
            if (data.status === 200) {
                // Instead of manually updating the scenario in the state,
                // fetch all scenarios again to ensure correct permissions
                await fetchScenarios();
                setEditingScenario(null);
                setIsCreating(false);
            } else {
                setError(data.error || 'Failed to update scenario');
            }
        } catch (err) {
            setError('Failed to update scenario');
            console.error('Error updating scenario:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (scenario: StringScenarioFormData) => {
        setEditingScenario(scenario);
        setIsCreating(true);
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
                    {isCreating ? (editingScenario ? 'Edit Scenario' : 'Create New Scenario') : 'Your Scenarios'}
                </h1>
                {!isCreating && (
                    <div className="flex space-x-4">
                        <input
                            type="file"
                            accept=".yaml,.yml"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={handleImportClick}
                            className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Import YAML
                        </button>
                        <button
                            onClick={() => {
                                setEditingScenario(null);
                                setIsCreating(true);
                            }}
                            className="px-6 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                        >
                            Create New Scenario
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p>{error}</p>
                </div>
            )}

            {isCreating ? (
                <CreateScenarioForm
                    onScenarioCreate={editingScenario ? handleScenarioEdit : handleScenarioCreate}
                    onCancel={() => {
                        setIsCreating(false);
                        setEditingScenario(null);
                    }}
                    initialData={editingScenario}
                />
            ) : isLoading ? (
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-gray-500 text-lg">Loading scenarios...</p>
                </div>
            ) : scenarios.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenarios.map((scenario, index) => (
                        <ScenarioCard
                            key={index}
                            scenario={scenario}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            ) : (
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