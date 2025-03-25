'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { US_STATES } from '../../utils/constants';

const FormSection = ({ title, children, isActive, errors = {} }) => {
    if (!isActive) return null;

    const hasErrors = Object.keys(errors).length > 0;

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

export const CreateScenarioForm = ({ onScenarioCreate, onCancel }) => {
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
        monthlyContribution: '',
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
                if (!formData.userBirthYear) newErrors.userBirthYear = 'Birth year is required';
                if (!formData.userLifeExpectancyMean) newErrors.userLifeExpectancyMean = 'Life expectancy is required';
                if (!formData.residenceState) newErrors.residenceState = 'Residence state is required';
                if (!formData.financialGoal) newErrors.financialGoal = 'Financial goal is required';
                if (!formData.forIndividual) {
                    if (!formData.spouseBirthYear) newErrors.spouseBirthYear = 'Spouse birth year is required';
                    if (!formData.spouseLifeExpectancyMean) newErrors.spouseLifeExpectancyMean = 'Spouse life expectancy is required';
                }
                break;
            // Add validation for other steps as needed
        }
        return newErrors;
    };

    const handleNext = () => {
        const stepErrors = validateStep(currentStep);
        if (Object.keys(stepErrors).length === 0) {
            if (currentStep < 5) {
                setCurrentStep(currentStep + 1);
            } else {
                onScenarioCreate(formData);
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
        <div className="p-6">
            <FormSection title="General Information" isActive={currentStep === 1} errors={errors}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Scenario Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={getInputClassName('name')}
                            placeholder="Ex: Retirement Plan 2024"
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="userBirthYear" className="block text-sm font-medium text-gray-700 mb-1">
                            Your Birth Year
                        </label>
                        <input
                            id="userBirthYear"
                            type="number"
                            name="userBirthYear"
                            value={formData.userBirthYear}
                            onChange={handleInputChange}
                            className={getInputClassName('userBirthYear')}
                            placeholder="Ex: 1990"
                        />
                        {errors.userBirthYear && <p className="mt-1 text-sm text-red-600">{errors.userBirthYear}</p>}
                    </div>

                    <div>
                        <label htmlFor="userLifeExpectancyMean" className="block text-sm font-medium text-gray-700 mb-1">
                            Life Expectancy (years)
                        </label>
                        <input
                            id="userLifeExpectancyMean"
                            type="number"
                            name="userLifeExpectancyMean"
                            value={formData.userLifeExpectancyMean}
                            onChange={handleInputChange}
                            className={getInputClassName('userLifeExpectancyMean')}
                            placeholder="Ex: 90"
                        />
                        {errors.userLifeExpectancyMean && <p className="mt-1 text-sm text-red-600">{errors.userLifeExpectancyMean}</p>}
                    </div>

                    <div>
                        <label htmlFor="userLifeExpectancyStd" className="block text-sm font-medium text-gray-700 mb-1">
                            Life Expectancy Standard Deviation (years)
                        </label>
                        <input
                            id="userLifeExpectancyStd"
                            type="number"
                            name="userLifeExpectancyStd"
                            value={formData.userLifeExpectancyStd}
                            onChange={handleInputChange}
                            className={getInputClassName('userLifeExpectancyStd')}
                            placeholder="Ex: 5"
                        />
                        {errors.userLifeExpectancyStd && <p className="mt-1 text-sm text-red-600">{errors.userLifeExpectancyStd}</p>}
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
                    </div>

                    <div>
                        <label htmlFor="residenceState" className="block text-sm font-medium text-gray-700 mb-1">
                            Residence State
                        </label>
                        <select
                            id="residenceState"
                            name="residenceState"
                            value={formData.residenceState}
                            onChange={handleInputChange}
                            className={getInputClassName('residenceState')}
                        >
                            <option value="">Select a state...</option>
                            {US_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                        {errors.residenceState && <p className="mt-1 text-sm text-red-600">{errors.residenceState}</p>}
                    </div>

                    <div>
                        <label htmlFor="financialGoal" className="block text-sm font-medium text-gray-700 mb-1">
                            Financial Goal ($)
                        </label>
                        <input
                            id="financialGoal"
                            type="number"
                            name="financialGoal"
                            value={formData.financialGoal}
                            onChange={handleInputChange}
                            className={getInputClassName('financialGoal')}
                            placeholder="Ex: 1000000"
                            min="0"
                            step="0.01"
                        />
                        {errors.financialGoal && <p className="mt-1 text-sm text-red-600">{errors.financialGoal}</p>}
                    </div>

                    <div>
                        <label htmlFor="inflationAssumption" className="block text-sm font-medium text-gray-700 mb-1">
                            Inflation Assumption
                        </label>
                        <select
                            id="inflationAssumption"
                            name="inflationAssumption"
                            value={formData.inflationAssumption}
                            onChange={handleInputChange}
                            className={getInputClassName('inflationAssumption')}
                        >
                            <option value="fixed">Fixed Rate</option>
                            <option value="uniform">Uniform Distribution</option>
                            <option value="normal">Normal Distribution</option>
                        </select>

                        {formData.inflationAssumption === 'fixed' && (
                            <div className="mt-4">
                                <label htmlFor="inflation" className="block text-sm font-medium text-gray-700 mb-1">
                                    Fixed Rate (%)
                                </label>
                                <input
                                    id="inflation"
                                    type="number"
                                    name="inflation"
                                    value={formData.inflation}
                                    onChange={handleInputChange}
                                    className={getInputClassName('inflation')}
                                    placeholder="2.0"
                                    step="0.1"
                                />
                            </div>
                        )}

                        {formData.inflationAssumption === 'uniform' && (
                            <>
                                <div className="mt-4">
                                    <label htmlFor="inflationMin" className="block text-sm font-medium text-gray-700 mb-1">
                                        Minimum Rate (%)
                                    </label>
                                    <input
                                        id="inflationMin"
                                        type="number"
                                        name="inflationMin"
                                        value={formData.inflationMin}
                                        onChange={handleInputChange}
                                        className={getInputClassName('inflationMin')}
                                        placeholder="1.0"
                                        step="0.1"
                                    />
                                </div>
                                <div className="mt-4">
                                    <label htmlFor="inflationMax" className="block text-sm font-medium text-gray-700 mb-1">
                                        Maximum Rate (%)
                                    </label>
                                    <input
                                        id="inflationMax"
                                        type="number"
                                        name="inflationMax"
                                        value={formData.inflationMax}
                                        onChange={handleInputChange}
                                        className={getInputClassName('inflationMax')}
                                        placeholder="3.0"
                                        step="0.1"
                                    />
                                </div>
                            </>
                        )}

                        {formData.inflationAssumption === 'normal' && (
                            <>
                                <div className="mt-4">
                                    <label htmlFor="inflationMean" className="block text-sm font-medium text-gray-700 mb-1">
                                        Mean Rate (%)
                                    </label>
                                    <input
                                        id="inflationMean"
                                        type="number"
                                        name="inflationMean"
                                        value={formData.inflationMean}
                                        onChange={handleInputChange}
                                        className={getInputClassName('inflationMean')}
                                        placeholder="2.0"
                                        step="0.1"
                                    />
                                </div>
                                <div className="mt-4">
                                    <label htmlFor="inflationStd" className="block text-sm font-medium text-gray-700 mb-1">
                                        Standard Deviation (%)
                                    </label>
                                    <input
                                        id="inflationStd"
                                        type="number"
                                        name="inflationStd"
                                        value={formData.inflationStd}
                                        onChange={handleInputChange}
                                        className={getInputClassName('inflationStd')}
                                        placeholder="0.5"
                                        step="0.1"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {!formData.forIndividual && (
                        <>
                            <div>
                                <label htmlFor="spouseBirthYear" className="block text-sm font-medium text-gray-700 mb-1">
                                    Spouse Birth Year
                                </label>
                                <input
                                    id="spouseBirthYear"
                                    type="number"
                                    name="spouseBirthYear"
                                    value={formData.spouseBirthYear}
                                    onChange={handleInputChange}
                                    className={getInputClassName('spouseBirthYear')}
                                    placeholder="Ex: 1992"
                                />
                                {errors.spouseBirthYear && <p className="mt-1 text-sm text-red-600">{errors.spouseBirthYear}</p>}
                            </div>

                            <div>
                                <label htmlFor="spouseLifeExpectancyMean" className="block text-sm font-medium text-gray-700 mb-1">
                                    Spouse Life Expectancy (years)
                                </label>
                                <input
                                    id="spouseLifeExpectancyMean"
                                    type="number"
                                    name="spouseLifeExpectancyMean"
                                    value={formData.spouseLifeExpectancyMean}
                                    onChange={handleInputChange}
                                    className={getInputClassName('spouseLifeExpectancyMean')}
                                    placeholder="Ex: 90"
                                />
                                {errors.spouseLifeExpectancyMean && <p className="mt-1 text-sm text-red-600">{errors.spouseLifeExpectancyMean}</p>}
                            </div>
                        </>
                    )}
                </div>
            </FormSection>

            <FormSection title="Events" isActive={currentStep === 4} errors={errors}>
                <div className="space-y-4">
                    <button
                        onClick={() => {
                            const newEventSeries = [...formData.eventSeries, {
                                type: '',
                                startYear: '',
                                duration: '',
                                amount: '',
                                annualChange: '',
                                changeType: 'fixed'
                            }];
                            setFormData({ ...formData, eventSeries: newEventSeries });
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
                        type="button"
                    >
                        Add Event
                    </button>

                    {formData.eventSeries.map((event, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor={`eventType-${index}`}
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Event Type
                                    </label>
                                    <select
                                        id={`eventType-${index}`}
                                        value={event.type}
                                        onChange={(e) => {
                                            const newEventSeries = [...formData.eventSeries];
                                            newEventSeries[index].type = e.target.value;
                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                        }}
                                        className={getInputClassName(`eventSeries.${index}.type`)}
                                    >
                                        <option value="">Select event type...</option>
                                        <option value="income">Income</option>
                                        <option value="expense">Expense</option>
                                        <option value="invest">Invest</option>
                                        <option value="rebalance">Rebalance</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor={`amount-${index}`}
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Amount ($)
                                    </label>
                                    <input
                                        id={`amount-${index}`}
                                        type="number"
                                        value={event.amount}
                                        onChange={(e) => {
                                            const newEventSeries = [...formData.eventSeries];
                                            newEventSeries[index].amount = e.target.value;
                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                        }}
                                        className={getInputClassName(`eventSeries.${index}.amount`)}
                                        placeholder="Ex: 50000"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor={`annualChangeType-${index}`}
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Annual Change Type
                                    </label>
                                    <select
                                        id={`annualChangeType-${index}`}
                                        value={event.changeType}
                                        onChange={(e) => {
                                            const newEventSeries = [...formData.eventSeries];
                                            newEventSeries[index].changeType = e.target.value;
                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                        }}
                                        className={getInputClassName(`eventSeries.${index}.changeType`)}
                                    >
                                        <option value="fixed">Fixed Amount</option>
                                        <option value="percentage">Percentage</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor={`annualChange-${index}`}
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Annual Change {event.changeType === 'percentage' ? '(%)' : '($)'}
                                    </label>
                                    <input
                                        id={`annualChange-${index}`}
                                        type="number"
                                        value={event.annualChange}
                                        onChange={(e) => {
                                            const newEventSeries = [...formData.eventSeries];
                                            newEventSeries[index].annualChange = e.target.value;
                                            setFormData({ ...formData, eventSeries: newEventSeries });
                                        }}
                                        className={getInputClassName(`eventSeries.${index}.annualChange`)}
                                        placeholder={event.changeType === 'percentage' ? "3.0" : "500"}
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const newEventSeries = formData.eventSeries.filter((_, i) => i !== index);
                                    setFormData({ ...formData, eventSeries: newEventSeries });
                                }}
                                className="mt-4 px-3 py-1 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                                type="button"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </FormSection>

            <div className="mt-8 flex justify-between">
                {currentStep > 1 && (
                    <button
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Previous
                    </button>
                )}
                <div className="flex space-x-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
                    >
                        {currentStep === 5 ? 'Create Scenario' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
}; 