import { NextResponse } from 'next/server';

// In-memory storage for simulation results
let explorationData = null;

export async function POST(request) {
    try {
        const data = await request.json();

        // Extract parameters from the request
        const { scenario, numberOfSimulations, quantityToMeasure } = data;

        if (!scenario) {
            return NextResponse.json({ error: 'No scenario provided' }, { status: 400 });
        }

        // Get parameter being explored
        const explorationParam = scenario.explorationParam || {};
        console.log(`Running exploration for ${explorationParam.id} = ${explorationParam.value}`);

        // In a production app, this would call your actual financial simulation engine
        // For this implementation, we'll generate realistic-looking mock data

        // Generate years from current year to 30 years in future
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 31 }, (_, i) => currentYear + i);

        // Generate sample time series data based on the parameter value and quantity
        let timeSeriesData;

        if (quantityToMeasure === 'successProbability') {
            // Success probability tends to decrease over time, but increases with:
            // - higher expenseAmount (more savings)
            // - higher assetAllocation (more stocks)
            // - earlier eventStartYear (for retirement, early retirement = more time to save)
            // - longer eventDuration

            const baseProb = 0.8; // Base success probability
            let paramEffect = 0;

            // Adjust parameter effect based on the parameter
            switch (explorationParam.id) {
                case 'rothEnabled':
                    paramEffect = explorationParam.value === 1 ? 0.15 : 0;
                    break;
                case 'eventStartYear':
                    // Earlier retirement date decreases probability
                    paramEffect = (2050 - explorationParam.value) / 25 * 0.3;
                    break;
                case 'eventDuration':
                    // Longer durations decrease probability slightly
                    paramEffect = (30 - explorationParam.value) / 29 * 0.2;
                    break;
                case 'incomeAmount':
                    // Higher income increases probability
                    paramEffect = (explorationParam.value - 50000) / 150000 * 0.25;
                    break;
                case 'expenseAmount':
                    // Higher expenses decrease probability
                    paramEffect = (100000 - explorationParam.value) / 80000 * 0.25;
                    break;
                case 'assetAllocation':
                    // Higher stock allocation increases probability
                    paramEffect = (explorationParam.value) / 100 * 0.15;
                    break;
            }

            // Generate time series with decreasing probability over time
            timeSeriesData = years.map((year, index) => {
                const yearEffect = -(index / 30) * 0.3; // Probability decreases over time
                let value = baseProb + paramEffect + yearEffect;

                // Add some randomness
                value += (Math.random() - 0.5) * 0.1;

                // Clamp between 0 and 1
                return Math.max(0, Math.min(1, value));
            });
        } else if (quantityToMeasure === 'totInvestments') {
            // Total investments grow over time, and are affected by:
            // - higher incomeAmount (more savings)
            // - lower expenseAmount (more savings)
            // - higher assetAllocation (more stocks = higher returns on average)

            const baseStartingAmount = 100000; // Base starting amount
            const baseAnnualGrowth = 1.07; // Base annual growth rate (7%)

            let startingAmountMod = 1;
            let growthRateMod = 0;

            // Adjust based on the parameter
            switch (explorationParam.id) {
                case 'rothEnabled':
                    // Roth conversions help avoid taxes, leading to more growth
                    startingAmountMod = 1;
                    growthRateMod = explorationParam.value === 1 ? 0.01 : 0;
                    break;
                case 'eventStartYear':
                    // More years until retirement = more time to save
                    startingAmountMod = 1 + (explorationParam.value - 2025) / 25 * 0.5;
                    growthRateMod = 0;
                    break;
                case 'eventDuration':
                    // Longer retirements don't affect starting amount
                    startingAmountMod = 1;
                    growthRateMod = -explorationParam.value / 100; // Slightly lower growth for longer durations
                    break;
                case 'incomeAmount':
                    // Higher income = more savings
                    startingAmountMod = 1 + (explorationParam.value - 50000) / 150000 * 2;
                    growthRateMod = 0;
                    break;
                case 'expenseAmount':
                    // Higher expenses = less savings
                    startingAmountMod = 1 - (explorationParam.value - 20000) / 80000 * 0.7;
                    growthRateMod = 0;
                    break;
                case 'assetAllocation':
                    // Higher stock allocation = higher returns but more volatility
                    startingAmountMod = 1;
                    growthRateMod = (explorationParam.value - 50) / 50 * 0.02;
                    break;
            }

            const startingAmount = baseStartingAmount * startingAmountMod;
            const growthRate = baseAnnualGrowth + growthRateMod;

            // Generate growth over time with compounding
            timeSeriesData = years.map((year, index) => {
                // Add some randomness to growth rate each year
                const annualGrowth = growthRate * (1 + (Math.random() - 0.5) * 0.2);
                return startingAmount * Math.pow(annualGrowth, index);
            });
        } else if (quantityToMeasure === 'income') {
            // Income changes based on working years vs retirement
            // Retirement event typically causes a significant drop

            // Assume retirement happens at eventStartYear parameter
            // or at scenario.retirementDate if exploring a different parameter
            let retirementYear = 2045; // Default

            if (explorationParam.id === 'eventStartYear') {
                retirementYear = explorationParam.value;
            } else if (scenario.retirementDate) {
                // Extract year from YYYY-MM-DD format
                retirementYear = parseInt(scenario.retirementDate.substring(0, 4), 10);
            }

            const workIncome = explorationParam.id === 'incomeAmount'
                ? explorationParam.value
                : 100000; // Base work income

            const retirementIncome = workIncome * 0.4; // Retirement income is 40% of working income

            // Generate income time series
            timeSeriesData = years.map(year => {
                if (year < retirementYear) {
                    // Working years - stable income with small raises
                    return workIncome * (1 + (year - currentYear) * 0.02);
                } else {
                    // Retirement years - lower income
                    return retirementIncome * (1 + (year - retirementYear) * 0.01);
                }
            });
        } else if (quantityToMeasure === 'expenses') {
            // Expenses change based on working years vs retirement and age

            // Base expense amount
            const baseExpense = explorationParam.id === 'expenseAmount'
                ? explorationParam.value
                : 60000;

            // Assume retirement happens at eventStartYear parameter
            // or at scenario.retirementDate if exploring a different parameter
            let retirementYear = 2045; // Default

            if (explorationParam.id === 'eventStartYear') {
                retirementYear = explorationParam.value;
            } else if (scenario.retirementDate) {
                // Extract year from YYYY-MM-DD format
                retirementYear = parseInt(scenario.retirementDate.substring(0, 4), 10);
            }

            // Generate expense time series
            timeSeriesData = years.map(year => {
                if (year < retirementYear) {
                    // Working years - expenses grow with inflation
                    return baseExpense * (1 + (year - currentYear) * 0.03);
                } else if (year < retirementYear + 15) {
                    // Early retirement - slightly higher expenses (travel, activities)
                    return baseExpense * 1.1 * (1 + (year - retirementYear) * 0.02);
                } else {
                    // Late retirement - medical costs increase
                    return baseExpense * (1 + (year - retirementYear - 15) * 0.04);
                }
            });
        } else {
            // Default fallback - provide simple data
            timeSeriesData = years.map((_, index) => 50000 * Math.pow(1.05, index));
        }

        // Store the result for retrieval later
        explorationData = {
            scenario: {
                id: scenario.id,
                name: scenario.name
            },
            parameter: explorationParam,
            timeSeriesData,
            quantityToMeasure
        };

        // Return the result
        return NextResponse.json(explorationData);

    } catch (error) {
        console.error('Exploration API error:', error);
        return NextResponse.json(
            { error: 'Failed to run parameter exploration: ' + error.message },
            { status: 500 }
        );
    }
}

// GET endpoint to retrieve the latest exploration result
export async function GET() {
    if (!explorationData) {
        return NextResponse.json(
            { error: 'No exploration data available' },
            { status: 404 }
        );
    }

    return NextResponse.json(explorationData);
} 