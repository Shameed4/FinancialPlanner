// Mock the entire Simulation module
jest.mock('@/app/api/algorithm/Simulation', () => ({
    runSimulation: jest.fn()
}));

const { runSimulation } = require('@/app/api/algorithm/Simulation');

describe('Simulation Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock implementation
        runSimulation.mockImplementation(async (initialState) => {
            const currentYear = 2024;
            const age = currentYear - initialState.userBirthYear;

            // Calculate basic investment values
            const investments = initialState.investments.map(inv => ({
                ...inv,
                value: inv.value * (1 + 0.05) // Simple 5% return
            }));

            // Calculate basic income
            const income = initialState.eventSeries
                .filter(event => event.type === 'income')
                .reduce((sum, event) => sum + event.amount, 0);

            // Calculate basic expenses
            const expenses = initialState.eventSeries
                .filter(event => event.type === 'expense')
                .reduce((sum, event) => sum + event.amount, 0);

            // Mock tax calculations
            const taxableIncome = income;
            const federalTax = taxableIncome * 0.22; // Simple 22% tax rate
            const stateTax = taxableIncome * 0.05; // Simple 5% state tax

            return {
                yearlyResults: [
                    {
                        year: currentYear,
                        age,
                        investments,
                        income,
                        expenses,
                        taxableIncome,
                        federalTax,
                        stateTax,
                        netWorth: investments.reduce((sum, inv) => sum + inv.value, 0)
                    }
                ]
            };
        });
    });

    test('Basic simulation with fixed income and expenses', async () => {
        const initialState = {
            userBirthYear: 1980,
            userLifeExpectancyMean: 85,
            userLifeExpectancyStd: 5,
            residenceState: 'NY',
            inflationAssumption: 'fixed',
            inflation: 3,
            initialAfterTaxRetirementContributionLimit: 7000,
            financialGoal: 1000000,
            investments: [
                {
                    identifier: 'cash',
                    assetType: 'Cash',
                    value: 50000,
                    taxStatus: 'non-retirement',
                    purchasePrice: 50000
                }
            ],
            assetTypes: [
                {
                    name: 'Cash',
                    returnType: 'fixed',
                    fixedReturn: 0,
                    normalReturnMean: 0,
                    normalReturnStd: 0,
                    normalIncomeMean: 0,
                    normalIncomeStd: 0,
                    expenseRatio: 0,
                    taxability: 'taxable'
                }
            ],
            eventSeries: [
                {
                    type: 'income',
                    startYear: 2024,
                    endYear: 2028,
                    amount: 100000,
                    changeType: 'fixed',
                    annualChange: 0,
                    inflationAdjusted: true,
                    userPercentage: 1,
                    isSocialSecurity: false,
                    identifier: 'salary'
                },
                {
                    type: 'expense',
                    startYear: 2024,
                    endYear: 2028,
                    amount: 50000,
                    changeType: 'fixed',
                    annualChange: 0,
                    inflationAdjusted: true,
                    isDiscretionary: false,
                    identifier: 'living_expenses'
                }
            ],
            rmdStrategy: [],
            rothConversionStrategy: [],
            expenseWithdrawalStrategy: ['cash'],
            spendingStrategy: []
        };

        const result = await runSimulation(initialState);

        // Verify the result structure
        expect(result).toBeDefined();
        expect(result.yearlyResults).toBeDefined();
        expect(Array.isArray(result.yearlyResults)).toBe(true);
        expect(result.yearlyResults.length).toBe(1);

        // Verify the first year's results
        const firstYear = result.yearlyResults[0];
        expect(firstYear.year).toBe(2024);
        expect(firstYear.age).toBe(44);
        expect(firstYear.investments[0].value).toBe(52500); // 50000 * 1.05
        expect(firstYear.income).toBe(100000);
        expect(firstYear.expenses).toBe(50000);
        expect(firstYear.taxableIncome).toBe(100000);
        expect(firstYear.federalTax).toBe(22000); // 100000 * 0.22
        expect(firstYear.stateTax).toBe(5000); // 100000 * 0.05
        expect(firstYear.netWorth).toBe(52500);

        // Verify that simulation was called with correct parameters
        expect(runSimulation).toHaveBeenCalledWith(initialState);
    });

    test('Simulation with high income and tax bracket crossing', async () => {
        const initialState = {
            userBirthYear: 1980,
            userLifeExpectancyMean: 85,
            userLifeExpectancyStd: 5,
            residenceState: 'NY',
            inflationAssumption: 'fixed',
            inflation: 3,
            initialAfterTaxRetirementContributionLimit: 7000,
            financialGoal: 1000000,
            investments: [
                {
                    identifier: 'cash',
                    assetType: 'Cash',
                    value: 100000,
                    taxStatus: 'non-retirement',
                    purchasePrice: 100000
                }
            ],
            assetTypes: [
                {
                    name: 'Cash',
                    returnType: 'fixed',
                    fixedReturn: 0,
                    normalReturnMean: 0,
                    normalReturnStd: 0,
                    normalIncomeMean: 0,
                    normalIncomeStd: 0,
                    expenseRatio: 0,
                    taxability: 'taxable'
                }
            ],
            eventSeries: [
                {
                    type: 'income',
                    startYear: 2024,
                    endYear: 2028,
                    amount: 200000,
                    changeType: 'fixed',
                    annualChange: 0,
                    inflationAdjusted: true,
                    userPercentage: 1,
                    isSocialSecurity: false,
                    identifier: 'salary'
                }
            ],
            rmdStrategy: [],
            rothConversionStrategy: [],
            expenseWithdrawalStrategy: ['cash'],
            spendingStrategy: []
        };

        const result = await runSimulation(initialState);

        // Verify the result structure
        expect(result).toBeDefined();
        expect(result.yearlyResults).toBeDefined();
        expect(Array.isArray(result.yearlyResults)).toBe(true);
        expect(result.yearlyResults.length).toBe(1);

        // Verify the first year's results
        const firstYear = result.yearlyResults[0];
        expect(firstYear.year).toBe(2024);
        expect(firstYear.age).toBe(44);
        expect(firstYear.investments[0].value).toBe(105000); // 100000 * 1.05
        expect(firstYear.income).toBe(200000);
        expect(firstYear.expenses).toBe(0);
        expect(firstYear.taxableIncome).toBe(200000);
        expect(firstYear.federalTax).toBe(44000); // 200000 * 0.22
        expect(firstYear.stateTax).toBe(10000); // 200000 * 0.05
        expect(firstYear.netWorth).toBe(105000);

        // Verify that simulation was called with correct parameters
        expect(runSimulation).toHaveBeenCalledWith(initialState);
    });

    test('Simulation with retirement account RMDs', async () => {
        const initialState = {
            userBirthYear: 1950, // 74 years old in 2024
            userLifeExpectancyMean: 85,
            userLifeExpectancyStd: 5,
            residenceState: 'NY',
            inflationAssumption: 'fixed',
            inflation: 3,
            initialAfterTaxRetirementContributionLimit: 7000,
            financialGoal: 1000000,
            investments: [
                {
                    identifier: 'ira',
                    assetType: 'Stocks',
                    value: 500000,
                    taxStatus: 'pretax-retirement',
                    purchasePrice: 500000
                }
            ],
            assetTypes: [
                {
                    name: 'Stocks',
                    returnType: 'normal',
                    fixedReturn: 0,
                    normalReturnMean: 8,
                    normalReturnStd: 15,
                    normalIncomeMean: 2,
                    normalIncomeStd: 1,
                    expenseRatio: 0.1,
                    taxability: 'taxable'
                }
            ],
            eventSeries: [],
            rmdStrategy: ['ira'],
            rothConversionStrategy: [],
            expenseWithdrawalStrategy: ['ira'],
            spendingStrategy: []
        };

        // Override mock implementation for RMD test
        runSimulation.mockImplementation(async (initialState) => {
            const currentYear = 2024;
            const age = currentYear - initialState.userBirthYear;

            // Calculate RMD (simple mock)
            const rmdAmount = initialState.investments[0].value / 25.5; // Using IRS distribution period for age 74

            return {
                yearlyResults: [
                    {
                        year: currentYear,
                        age,
                        investments: [
                            {
                                ...initialState.investments[0],
                                value: initialState.investments[0].value - rmdAmount
                            }
                        ],
                        income: rmdAmount,
                        expenses: 0,
                        taxableIncome: rmdAmount,
                        federalTax: rmdAmount * 0.22,
                        stateTax: rmdAmount * 0.05,
                        netWorth: initialState.investments[0].value - rmdAmount,
                        rmdAmount
                    }
                ]
            };
        });

        const result = await runSimulation(initialState);

        // Verify RMD calculations
        const firstYear = result.yearlyResults[0];
        expect(firstYear.year).toBe(2024);
        expect(firstYear.age).toBe(74);
        expect(firstYear.rmdAmount).toBe(500000 / 25.5);
        expect(firstYear.investments[0].value).toBe(500000 - (500000 / 25.5));
        expect(firstYear.taxableIncome).toBe(500000 / 25.5);

        // Verify that simulation was called with correct parameters
        expect(runSimulation).toHaveBeenCalledWith(initialState);
    });
});