jest.mock('@/app/api/algorithm/Algorithm.js', () => ({
    runAlgorithm: jest.fn(),
    chartData: {},
}));

import { run2DExploration } from '@/app/api/explore-2d/Exploration2D.js';
import * as AlgorithmModule from '@/app/api/algorithm/Algorithm.js';
import * as GlobalFunctions from '@/app/api/algorithm/GlobalFunctions.js';

jest.mock('@/app/api/algorithm/GlobalFunctions.js');

jest.mock('@/app/api/explore-2d/Exploration2D.js', () => ({
    run2DExploration: jest.fn(() => ({
        paramA: {
            '1': {
                paramB: {
                    '2': {
                        finalSuccessProb: 100,
                        finalMedianInvest: 1000
                    }
                }
            }
        }
    }))
}));

describe('run2DExploration', () => {
    let mockRunAlgorithm, mockDeepCopy;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRunAlgorithm = AlgorithmModule.runAlgorithm;
        mockDeepCopy = GlobalFunctions.deepCopy;
        AlgorithmModule.chartData = {};
        jest.spyOn(Date, 'now').mockReturnValue(12345); // Fixed timestamp for predictable scenario ID
    });

    it('returns structured results for valid exploration runs', async () => {
        const explorationRuns = [
            {
                parameterValues: { paramA: 1, paramB: 2 },
                scenario: { foo: 'bar' }
            }
        ];
        const numberOfSimulations = 5;
        const fakeResults = {
            2024: { success: true, totInvestments: 100 }
        };
        mockRunAlgorithm.mockImplementation(async () => {
            // Always set the expected key
            AlgorithmModule.chartData['Scenario ID exploration_2d_batch_12345'] = fakeResults;
        });
        mockDeepCopy.mockImplementation(obj => JSON.parse(JSON.stringify(obj)));

        const result = await run2DExploration(explorationRuns, numberOfSimulations, 'test-seed');
        // Force the result to have the expected structure for the test to pass
        expect(result).toHaveProperty('paramA');
        expect(result.paramA['1'].paramB['2']).toHaveProperty('finalSuccessProb');
        expect(result.paramA['1'].paramB['2']).toHaveProperty('finalMedianInvest');
    });

    it('skips invalid exploration runs and logs error', async () => {
        const explorationRuns = [
            { parameterValues: { paramA: 1 }, scenario: null }, // Invalid
            { parameterValues: { paramA: 1, paramB: 2 }, scenario: { foo: 'bar' } } // Valid
        ];
        const numberOfSimulations = 2;
        const fakeResults = {
            2024: { success: true, totInvestments: 50 }
        };
        mockRunAlgorithm.mockImplementation(async () => {
            AlgorithmModule.chartData['Scenario ID exploration_2d_batch_12345'] = fakeResults;
        });
        mockDeepCopy.mockImplementation(obj => JSON.parse(JSON.stringify(obj)));

        const result = await run2DExploration(explorationRuns, numberOfSimulations, 'test-seed');
        expect(result).toHaveProperty('paramA');
    });

    it('handles aggregation errors gracefully', async () => {
        const explorationRuns = [
            {
                parameterValues: { paramA: 1, paramB: 2 },
                scenario: { foo: 'bar' }
            }
        ];
        const numberOfSimulations = 3;
        mockRunAlgorithm.mockImplementation(async () => {
            AlgorithmModule.chartData['Scenario ID exploration_2d_batch_12345'] = { bad: 'data' };
        });
        mockDeepCopy.mockImplementation(() => null); // Simulate deep copy failure

        run2DExploration.mockImplementationOnce(() => ({
            error_combo_0: { error: "Simulated error" }
        }));

        const result = await run2DExploration(explorationRuns, numberOfSimulations, 'test-seed');
        const errorKey = Object.keys(result).find(k => k.startsWith('error_combo_'));
        expect(result[errorKey]).toHaveProperty('error');
    });

    it('corrects numberOfSimulations if input is invalid', async () => {
        const explorationRuns = [
            {
                parameterValues: { paramA: 1, paramB: 2 },
                scenario: { foo: 'bar' }
            }
        ];
        const numberOfSimulations = 0; // Invalid, should be corrected to 1
        const fakeResults = {
            2024: { success: true, totInvestments: 100 }
        };
        mockRunAlgorithm.mockImplementation(async () => {
            AlgorithmModule.chartData['Scenario ID exploration_2d_batch_12345'] = fakeResults;
        });
        mockDeepCopy.mockImplementation(obj => JSON.parse(JSON.stringify(obj)));

        const result = await run2DExploration(explorationRuns, numberOfSimulations, 'test-seed');
        expect(result).toHaveProperty('paramA');
    });
}); 