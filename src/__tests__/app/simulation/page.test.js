import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimulationPage from '../../../app/simulation/page';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Increase Jest timeout for async operations
jest.setTimeout(10000);

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession: jest.fn()
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className }) => <div className={className}>{children}</div>,
    },
}));

describe('SimulationPage', () => {
    const mockScenarios = [
        {
            id: '1',
            name: 'Test Scenario 1',
            retirementDate: '2025-01-01'
        },
        {
            id: '2',
            name: 'Test Scenario 2',
            retirementDate: '2026-01-01'
        }
    ];

    const mockSession = {
        data: {
            user: {
                email: 'test@example.com',
                name: 'Test User'
            }
        }
    };

    const mockRouter = {
        push: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        useSession.mockReturnValue(mockSession);
        useRouter.mockReturnValue(mockRouter);
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('renders the page title', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: [] })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        expect(screen.getByText('Your Scenario')).toBeInTheDocument();
    });

    it('shows "Create a Scenario" button when no scenarios exist', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: [] })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Create a Scenario')).toBeInTheDocument();
        });
    });

    it('shows "Explore Parameters" button when scenarios exist', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Explore Parameters')).toBeInTheDocument();
        });
    });

    it('displays scenario cards when scenarios are loaded', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Test Scenario 1')).toBeInTheDocument();
            expect(screen.getByText('Test Scenario 2')).toBeInTheDocument();
        });
    });

    it('allows selecting a scenario', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        const scenarioCard = await waitFor(() => screen.getByText('Test Scenario 1'));

        await act(async () => {
            fireEvent.click(scenarioCard);
        });

        expect(scenarioCard.closest('button')).toHaveClass('ring-2');
    });

    it('allows changing simulation count', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        const simulationCountInput = screen.getByPlaceholderText('5');

        await act(async () => {
            fireEvent.change(simulationCountInput, { target: { value: '10' } });
        });

        expect(simulationCountInput.value).toBe('10');
    });

    it('shows loading overlay during simulation', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        const scenarioCard = await waitFor(() => screen.getByText('Test Scenario 1'));

        await act(async () => {
            fireEvent.click(scenarioCard);
        });

        const beginButton = screen.getByText('Begin');

        let simulationPromiseResolve;
        global.fetch.mockImplementationOnce(() => new Promise(resolve => {
            simulationPromiseResolve = resolve;
        }));

        await act(async () => {
            fireEvent.click(beginButton);
        });

        expect(screen.getByText('Running simulation...')).toBeInTheDocument();

        simulationPromiseResolve({
            ok: true,
            json: () => Promise.resolve({ result: { success: true } })
        });
    });

    it('handles simulation error gracefully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        await act(async () => {
            render(<SimulationPage />);
        });

        const scenarioCard = await waitFor(() => screen.getByText('Test Scenario 1'));

        await act(async () => {
            fireEvent.click(scenarioCard);
        });

        const beginButton = screen.getByText('Begin');

        global.fetch.mockRejectedValueOnce(new Error('Simulation failed'));

        await act(async () => {
            fireEvent.click(beginButton);
        });

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        consoleErrorSpy.mockRestore();
    });

    it('navigates to scenario creation page when no scenarios exist', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: [] })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        const createButton = await waitFor(() => screen.getByText('Create a Scenario'));

        await act(async () => {
            fireEvent.click(createButton);
        });

        expect(mockRouter.push).toHaveBeenCalledWith('/scenario');
    });

    it('navigates to exploration page when scenarios exist', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        const exploreButton = await waitFor(() => screen.getByText('Explore Parameters'));

        await act(async () => {
            fireEvent.click(exploreButton);
        });

        expect(mockRouter.push).toHaveBeenCalledWith('/exploration-1d');
    });

    it('disables begin button when no scenario is selected', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        const beginButton = await waitFor(() => screen.getByText('Begin'));
        expect(beginButton).toBeDisabled();
    });

    it('enables begin button when scenario is selected', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        const scenarioCard = await waitFor(() => screen.getByText('Test Scenario 1'));

        await act(async () => {
            fireEvent.click(scenarioCard);
        });

        const beginButton = screen.getByText('Begin');
        expect(beginButton).not.toBeDisabled();
    });

    it('handles fetch scenarios error gracefully', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        await act(async () => {
            render(<SimulationPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Create a Scenario')).toBeInTheDocument();
        });
    });

    it('handles successful simulation with complete flow', async () => {
        // Mock sessionStorage
        const mockSessionStorage = {};
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                getItem: jest.fn((key) => mockSessionStorage[key]),
                setItem: jest.fn((key, value) => {
                    mockSessionStorage[key] = value;
                }),
            },
            writable: true
        });

        // Mock successful scenario fetch
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        // Mock successful simulation response
        const mockSimulationResponse = {
            timestamp: new Date().toISOString(),
            chartData: {
                'Scenario 1': [/* data */],
                'Scenario 2': [/* data */]
            }
        };

        // Mock successful verification response
        const mockVerificationResponse = {
            chartData: {
                'Scenario 1': [/* data */],
                'Scenario 2': [/* data */]
            }
        };

        await act(async () => {
            render(<SimulationPage />);
        });

        // Select a scenario
        const scenarioCard = await waitFor(() => screen.getByText('Test Scenario 1'));
        await act(async () => {
            fireEvent.click(scenarioCard);
        });

        // Set up fetch mocks for simulation and verification
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSimulationResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockVerificationResponse)
            });

        // Click begin button
        const beginButton = screen.getByText('Begin');
        await act(async () => {
            fireEvent.click(beginButton);
        });

        // Verify loading state
        expect(screen.getByText('Running simulation...')).toBeInTheDocument();

        // Wait for simulation to complete and verify storage
        await waitFor(() => {
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                'simulationData',
                JSON.stringify(mockSimulationResponse)
            );
        });

        // Wait for navigation
        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith(expect.stringMatching(/\/charts-results\?t=\d+/));
        }, { timeout: 2000 }); // Increase timeout to account for the delay
    });

    it('handles simulation errors with invalid response', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        // Select a scenario
        const scenarioCard = await waitFor(() => screen.getByText('Test Scenario 1'));
        await act(async () => {
            fireEvent.click(scenarioCard);
        });

        // Mock invalid simulation response
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                // Missing required fields like timestamp and chartData
                someOtherField: 'value'
            })
        });

        // Click begin button
        const beginButton = screen.getByText('Begin');
        await act(async () => {
            fireEvent.click(beginButton);
        });

        // Wait for loading state to be removed and button to be re-enabled
        await waitFor(() => {
            expect(beginButton).not.toBeDisabled();
            expect(beginButton).toHaveTextContent('Begin');
        });

        // Verify that the error was logged
        expect(consoleSpy).toHaveBeenCalledWith(
            'Simulation error:',
            expect.any(Error)
        );

        consoleSpy.mockRestore();
    });

    it('handles session storage errors during simulation', async () => {
        // Mock sessionStorage to throw error
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(() => {
                    throw new Error('Storage error');
                }),
            },
            writable: true
        });

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        const mockSimulationResponse = {
            timestamp: new Date().toISOString(),
            chartData: {
                'Scenario 1': [/* data */]
            }
        };

        const mockVerificationResponse = {
            chartData: {
                'Scenario 1': [/* data */]
            }
        };

        await act(async () => {
            render(<SimulationPage />);
        });

        // Select a scenario
        const scenarioCard = await waitFor(() => screen.getByText('Test Scenario 1'));
        await act(async () => {
            fireEvent.click(scenarioCard);
        });

        // Set up fetch mocks
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSimulationResponse)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockVerificationResponse)
            });

        // Click begin button
        const beginButton = screen.getByText('Begin');
        await act(async () => {
            fireEvent.click(beginButton);
        });

        // Wait for all promises to resolve
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the delay in the component
        });

        // Verify that the simulation continues despite storage error
        expect(mockRouter.push).toHaveBeenCalledWith(expect.stringMatching(/\/charts-results\?t=\d+/));
    });

    it('handles HTTP errors during simulation', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        // Select a scenario
        const scenarioCard = await waitFor(() => screen.getByText('Test Scenario 1'));
        await act(async () => {
            fireEvent.click(scenarioCard);
        });

        // Mock failed HTTP response
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Internal server error')
        });

        // Click begin button
        const beginButton = screen.getByText('Begin');
        await act(async () => {
            fireEvent.click(beginButton);
        });

        // Verify error handling
        await waitFor(() => {
            expect(screen.queryByText('Running simulation...')).not.toBeInTheDocument();
            expect(beginButton).not.toBeDisabled();
        });
    });

    it('navigates to results page when View Results button is clicked', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ result: mockScenarios })
        });

        await act(async () => {
            render(<SimulationPage />);
        });

        const viewResultsButton = screen.getByText('View Results');
        await act(async () => {
            fireEvent.click(viewResultsButton);
        });

        expect(mockRouter.push).toHaveBeenCalledWith('/charts-results');
    });
}); 