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

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
        >
            <h2 className="text-2xl font-semibold mb-6">{title}</h2>
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
            {scenario.type === 'Married Couple' && (
                <>
                    <p>Spouse Birth Year: {scenario.spouseBirthYear}</p>
                    <p>Spouse Life Expectancy: {scenario.spouseLifeExpectancy} years</p>
                </>
            )}
            <div className="pt-4">
                <p className="font-medium">Financial Details</p>
                <p>Current Savings: ${scenario.currentSavings}</p>
                <p>Monthly Contribution: ${scenario.monthlyContribution}</p>
                <p>Risk Tolerance: {scenario.riskTolerance}</p>
                <p>Investment: {scenario.investmentPreference}</p>
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
        spouseBirthYear: '',
        lifeExpectancy: '',
        spouseLifeExpectancy: '',
        retirementAge: '',
        spouseRetirementAge: '',
        currentSavings: '',
        monthlyContribution: '',
        riskTolerance: '',
        investmentPreference: ''
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
                if (formData.type === 'Married Couple') {
                    if (!formData.spouseBirthYear) newErrors.spouseBirthYear = 'Spouse birth year is required';
                    if (!formData.spouseLifeExpectancy) newErrors.spouseLifeExpectancy = 'Spouse life expectancy is required';
                }
                break;
            case 2:
                if (!formData.retirementAge) newErrors.retirementAge = 'Retirement age is required';
                if (formData.type === 'Married Couple' && !formData.spouseRetirementAge) {
                    newErrors.spouseRetirementAge = 'Spouse retirement age is required';
                }
                break;
            case 3:
                if (!formData.currentSavings) newErrors.currentSavings = 'Current savings is required';
                if (!formData.monthlyContribution) newErrors.monthlyContribution = 'Monthly contribution is required';
                break;
            case 4:
                if (!formData.riskTolerance) newErrors.riskTolerance = 'Risk tolerance is required';
                if (!formData.investmentPreference) newErrors.investmentPreference = 'Investment preference is required';
                break;
        }
        return newErrors;
    };

    const handleNext = () => {
        const stepErrors = validateStep(currentStep);
        if (Object.keys(stepErrors).length === 0) {
            if (currentStep < 4) {
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
            : 'border-gray-300 focus:ring-black focus:border-black'
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
                {[1, 2, 3, 4].map((step) => (
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={getInputClassName('name')}
                            placeholder="John Doe"
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
                            className={getInputClassName('type')}
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
                            className={getInputClassName('birthYear')}
                            placeholder="1990"
                        />
                    </div>
                    {formData.type === 'Married Couple' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Birth Year</label>
                            <input
                                type="number"
                                name="spouseBirthYear"
                                value={formData.spouseBirthYear}
                                onChange={handleInputChange}
                                className={getInputClassName('spouseBirthYear')}
                                placeholder="1992"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Life Expectancy (years)</label>
                        <input
                            type="number"
                            name="lifeExpectancy"
                            value={formData.lifeExpectancy}
                            onChange={handleInputChange}
                            className={getInputClassName('lifeExpectancy')}
                            placeholder="90"
                        />
                    </div>
                    {formData.type === 'Married Couple' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Spouse Life Expectancy (years)
                            </label>
                            <input
                                type="number"
                                name="spouseLifeExpectancy"
                                value={formData.spouseLifeExpectancy}
                                onChange={handleInputChange}
                                className={getInputClassName('spouseLifeExpectancy')}
                                placeholder="90"
                            />
                        </div>
                    )}
                </div>
            </FormSection>

            <FormSection title="Retirement Planning" isActive={currentStep === 2} errors={errors}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Retirement Age</label>
                        <input
                            type="number"
                            name="retirementAge"
                            value={formData.retirementAge}
                            onChange={handleInputChange}
                            className={getInputClassName('retirementAge')}
                            placeholder="65"
                        />
                    </div>
                    {formData.type === 'Married Couple' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Spouse Retirement Age
                            </label>
                            <input
                                type="number"
                                name="spouseRetirementAge"
                                value={formData.spouseRetirementAge}
                                onChange={handleInputChange}
                                className={getInputClassName('spouseRetirementAge')}
                                placeholder="65"
                            />
                        </div>
                    )}
                </div>
            </FormSection>

            <FormSection title="Financial Information" isActive={currentStep === 3} errors={errors}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Savings ($)</label>
                        <input
                            type="number"
                            name="currentSavings"
                            value={formData.currentSavings}
                            onChange={handleInputChange}
                            className={getInputClassName('currentSavings')}
                            placeholder="100000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monthly Contribution ($)
                        </label>
                        <input
                            type="number"
                            name="monthlyContribution"
                            value={formData.monthlyContribution}
                            onChange={handleInputChange}
                            className={getInputClassName('monthlyContribution')}
                            placeholder="1000"
                        />
                    </div>
                </div>
            </FormSection>

            <FormSection title="Investment Preferences" isActive={currentStep === 4} errors={errors}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Risk Tolerance</label>
                        <select
                            name="riskTolerance"
                            value={formData.riskTolerance}
                            onChange={handleInputChange}
                            className={getInputClassName('riskTolerance')}
                        >
                            <option value="">Select...</option>
                            <option value="Conservative">Conservative</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Aggressive">Aggressive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Investment Preference</label>
                        <select
                            name="investmentPreference"
                            value={formData.investmentPreference}
                            onChange={handleInputChange}
                            className={getInputClassName('investmentPreference')}
                        >
                            <option value="">Select...</option>
                            <option value="Stocks">Stocks</option>
                            <option value="Bonds">Bonds</option>
                            <option value="Mixed">Mixed Portfolio</option>
                            <option value="RealEstate">Real Estate</option>
                        </select>
                    </div>
                </div>
            </FormSection>

            <div className="flex justify-between mt-8">
                <button
                    onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
                    className={`px-6 py-2 rounded-md ${currentStep === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                    disabled={currentStep === 1}
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    className="px-6 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                >
                    {currentStep === 4 ? 'Create' : 'Next'}
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
                <h1 className="text-3xl font-bold">
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