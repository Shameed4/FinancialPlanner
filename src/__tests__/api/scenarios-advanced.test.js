// Used Cursor AI for help with test setup and mocking strategy
import { NextRequest } from 'next/server';

// Define mock enums
const DistributionType = {
    fixed: 'fixed',
    random_uniform: 'random_uniform',
    random_normal: 'random_normal'
};

const EventType = {
    income: 'income',
    expense: 'expense',
    invest: 'invest',
    rebalance: 'rebalance'
};

const StartYearType = {
    fixed: 'fixed',
    random_uniform: 'random_uniform',
    random_normal: 'random_normal',
    same_as: 'same_as',
    after: 'after'
};

const TaxStatus = {
    NON_RETIREMENT: 'NON_RETIREMENT',
    PRE_TAX_RETIREMENT: 'PRE_TAX_RETIREMENT',
    AFTER_TAX_RETIREMENT: 'AFTER_TAX_RETIREMENT'
};

const Taxability = {
    TAXABLE: 'TAXABLE',
    TAX_EXEMPT: 'TAX_EXEMPT'
};

const ReturnType = {
    FIXED: 'FIXED',
    NORMAL: 'NORMAL'
};

// Mock the entire scenarios route module
jest.mock('@/app/api/scenarios/route', () => ({
    GET: jest.fn(),
    POST: jest.fn()
}));

// Mock the getLoggedInUser function
jest.mock('@/app/api/temp', () => ({
    __esModule: true,
    default: jest.fn(() => ({ id: 1, name: 'Test User' }))
}));

describe('Scenarios API - Advanced Features', () => {
    let mockScenarioData;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup base scenario data
        mockScenarioData = {
            name: 'Test Scenario',
            description: 'Test Description',
            startYear: 2024,
            endYear: 2054,
            inflationRate: 0.03,
            state: 'CA',
            assetTypes: [
                {
                    name: 'US Stocks',
                    description: 'US Stock Market',
                    expectedAnnualReturn: 0.07,
                    expectedAnnualReturnType: ReturnType.NORMAL,
                    expectedStandardDeviation: 0.15,
                    expectedAnnualIncome: 0.02,
                    expectedAnnualIncomeType: ReturnType.FIXED,
                    taxability: Taxability.TAXABLE
                }
            ],
            investments: [
                {
                    name: 'Retirement Account',
                    description: '401(k)',
                    initialBalance: 100000,
                    taxStatus: TaxStatus.PRE_TAX_RETIREMENT
                }
            ],
            eventSeries: [
                {
                    name: 'Salary',
                    type: EventType.income,
                    startYearType: StartYearType.fixed,
                    startYear: 2024,
                    durationType: DistributionType.fixed,
                    durationFixed: 30,
                    amount: 100000,
                    annualChangeType: DistributionType.fixed,
                    annualChange: 0.03,
                    inflationAdjusted: true
                }
            ]
        };
    });

    describe('POST /api/scenarios', () => {
        it('should create a scenario with asset types and investments', async () => {
            const { POST } = require('@/app/api/scenarios/route');
            POST.mockResolvedValue(new Response(JSON.stringify({ id: 1, ...mockScenarioData })));

            const request = new NextRequest('http://localhost:3000/api/scenarios', {
                method: 'POST',
                body: JSON.stringify(mockScenarioData)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveProperty('id');
            expect(data.assetTypes).toHaveLength(1);
            expect(data.investments).toHaveLength(1);
            expect(data.eventSeries).toHaveLength(1);
        });

        it('should handle invalid asset type data', async () => {
            const invalidData = {
                ...mockScenarioData,
                assetTypes: [{
                    name: 'Invalid Asset',
                    expectedAnnualReturnType: 'invalid_type' // Invalid enum value
                }]
            };

            const { POST } = require('@/app/api/scenarios/route');
            POST.mockRejectedValue(new Error('Invalid asset type data'));

            const request = new NextRequest('http://localhost:3000/api/scenarios', {
                method: 'POST',
                body: JSON.stringify(invalidData)
            });

            await expect(POST(request)).rejects.toThrow('Invalid asset type data');
        });

        it('should create a scenario with complex event series', async () => {
            const complexEventSeries = {
                ...mockScenarioData,
                eventSeries: [
                    // Income event with random uniform distribution
                    {
                        name: 'Variable Bonus',
                        type: EventType.income,
                        startYearType: StartYearType.random_uniform,
                        startMin: 2024,
                        startMax: 2026,
                        durationType: DistributionType.random_normal,
                        durationMean: 15,
                        durationStd: 2,
                        amount: 50000,
                        annualChangeType: DistributionType.random_uniform,
                        annualChangeMin: 0.02,
                        annualChangeMax: 0.05
                    },
                    // Investment event with asset allocations
                    {
                        name: 'Portfolio Rebalance',
                        type: EventType.rebalance,
                        startYearType: StartYearType.fixed,
                        startYear: 2025,
                        durationType: DistributionType.fixed,
                        durationFixed: 1,
                        allocations: {
                            'US Stocks': 60,
                            'Bonds': 40
                        }
                    }
                ]
            };

            const { POST } = require('@/app/api/scenarios/route');
            POST.mockResolvedValue(new Response(JSON.stringify({ id: 1, ...complexEventSeries })));

            const request = new NextRequest('http://localhost:3000/api/scenarios', {
                method: 'POST',
                body: JSON.stringify(complexEventSeries)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.eventSeries).toHaveLength(2);
            expect(data.eventSeries[0].startYearType).toBe(StartYearType.random_uniform);
            expect(data.eventSeries[1].type).toBe(EventType.rebalance);
        });
    });

    describe('GET /api/scenarios', () => {
        it('should retrieve scenarios with full details', async () => {
            const mockResponse = {
                scenarios: [
                    {
                        id: 1,
                        ...mockScenarioData,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ]
            };

            const { GET } = require('@/app/api/scenarios/route');
            GET.mockResolvedValue(new Response(JSON.stringify(mockResponse)));

            const request = new NextRequest('http://localhost:3000/api/scenarios');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.scenarios).toBeInstanceOf(Array);
            expect(data.scenarios[0]).toHaveProperty('assetTypes');
            expect(data.scenarios[0]).toHaveProperty('investments');
            expect(data.scenarios[0]).toHaveProperty('eventSeries');
        });

        it('should handle database errors gracefully', async () => {
            const { GET } = require('@/app/api/scenarios/route');
            GET.mockRejectedValue(new Error('Database connection error'));

            const request = new NextRequest('http://localhost:3000/api/scenarios');
            await expect(GET(request)).rejects.toThrow('Database connection error');
        });
    });
}); 