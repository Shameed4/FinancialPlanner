import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import ScenarioCard from '@/app/scenario/components/ScenarioCard';
import { jsonToYaml } from '@/utils/scenarioConverter';
import '@testing-library/jest-dom';

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession: () => ({
        data: {
            user: {
                email: 'test@example.com'
            }
        }
    })
}));

// Mock jsonToYaml
jest.mock('@/utils/scenarioConverter', () => ({
    jsonToYaml: jest.fn()
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Mock ShareScenarioModal
jest.mock('@/app/scenario/components/ShareScenarioModal', () => {
    return function MockShareScenarioModal({ isOpen }) {
        return isOpen ? <dialog>Share Modal Content</dialog> : null;
    };
});

describe('ScenarioCard', () => {
    const mockScenario = {
        name: 'Test Scenario',
        forIndividual: true,
        residenceState: 'NY',
        userBirthYear: 1990,
        financialGoal: 1000000,
        assetTypes: ['Stocks', 'Bonds'],
        permissions: {
            isOwner: true,
            canWrite: true
        },
        investmentScenario: [
            { investment: { assetType: 'Stocks', value: 50000 } },
            { investment: { assetType: 'Bonds', value: 30000 } }
        ]
    };

    const mockOnEdit = jest.fn();

    let container;

    beforeEach(() => {
        jest.clearAllMocks();
        global.URL.createObjectURL.mockReturnValue('mock-url');
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    const renderComponent = async (scenario, onEdit = mockOnEdit) => {
        let rendered;

        await act(async () => {
            rendered = render(<ScenarioCard scenario={scenario} onEdit={onEdit} />, { container });
        });
        return { ...rendered, container };
    };

    it('renders basic scenario information', async () => {
        await renderComponent(mockScenario);

        expect(screen.getByText('Test Scenario')).toBeInTheDocument();
        expect(screen.getByText('Individual • NY')).toBeInTheDocument();
        expect(screen.getByText('1990')).toBeInTheDocument();
        expect(screen.getByText('$1,000,000')).toBeInTheDocument();
        expect(screen.getByText('Stocks, Bonds')).toBeInTheDocument();
    });

    it('renders married couple information when not individual', async () => {
        const marriedScenario = {
            ...mockScenario,
            forIndividual: false,
            spouseBirthYear: 1992
        };
        await renderComponent(marriedScenario);

        expect(screen.getByText('Married Couple • NY')).toBeInTheDocument();
        expect(screen.getByText('1992')).toBeInTheDocument();
    });

    it('shows correct permission badge for owner', async () => {
        await renderComponent(mockScenario);
        expect(screen.getByText('Owner')).toBeInTheDocument();
    });

    it('shows correct permission badge for editor', async () => {
        const editorScenario = {
            ...mockScenario,
            permissions: { isOwner: false, canWrite: true }
        };
        await renderComponent(editorScenario);
        expect(screen.getByText('Editor')).toBeInTheDocument();
    });

    it('shows correct permission badge for viewer', async () => {
        const viewerScenario = {
            ...mockScenario,
            permissions: { isOwner: false, canWrite: false }
        };
        await renderComponent(viewerScenario);
        expect(screen.getByText('Viewer')).toBeInTheDocument();
    });

    it('shows edit button for owners and editors', async () => {
        await renderComponent(mockScenario);
        const editButton = screen.getByText('Edit');
        expect(editButton).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(editButton);
        });
        expect(mockOnEdit).toHaveBeenCalledWith(mockScenario);
    });

    it('hides edit button for viewers', async () => {
        const viewerScenario = {
            ...mockScenario,
            permissions: { isOwner: false, canWrite: false }
        };
        await renderComponent(viewerScenario);
        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('shows share button only for owners', async () => {
        const ownerScenario = {
            id: '1',
            name: 'Test Scenario',
            owner: 'test@example.com',
            retirementDate: '2025-01-01',
            permissions: { isOwner: true }
        };

        const { getByText, queryByText } = await renderComponent(ownerScenario);
        const shareButton = getByText('Share');
        expect(shareButton).toBeInTheDocument();

        const nonOwnerScenario = {
            ...ownerScenario,
            owner: 'other@example.com',
            permissions: { isOwner: false }
        };

        const { queryByText: nonOwnerQueryByText } = await renderComponent(nonOwnerScenario);
        expect(nonOwnerQueryByText('Share')).not.toBeInTheDocument();
    });

    it('handles download functionality', async () => {
        const scenario = {
            id: '1',
            name: 'Test Scenario',
            owner: 'test@example.com',
            retirementDate: '2025-01-01'
        };

        jsonToYaml.mockResolvedValueOnce('yaml content');
        const { getByText } = await renderComponent(scenario);

        const downloadButton = getByText('Download YAML');
        await act(async () => {
            fireEvent.click(downloadButton);
        });

        expect(jsonToYaml).toHaveBeenCalledWith(scenario);
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('handles download error gracefully', async () => {
        const scenario = {
            id: '1',
            name: 'Test Scenario',
            owner: 'test@example.com',
            retirementDate: '2025-01-01'
        };

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        jsonToYaml.mockRejectedValueOnce(new Error('Conversion failed'));

        const { getByText } = await renderComponent(scenario);

        const downloadButton = getByText('Download YAML');
        await act(async () => {
            fireEvent.click(downloadButton);
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('extracts asset types from investments when assetTypes array is not present', async () => {
        const scenario = {
            id: '1',
            name: 'Test Scenario',
            owner: 'test@example.com',
            retirementDate: '2025-01-01',
            investments: [
                { type: 'IRA' },
                { type: '401k' }
            ]
        };

        const { getByText } = await renderComponent(scenario);
        expect(getByText('None')).toBeInTheDocument();
    });

    it('shows "None" when no asset types are available', async () => {
        const scenario = {
            id: '1',
            name: 'Test Scenario',
            owner: 'test@example.com',
            retirementDate: '2025-01-01',
            investments: []
        };

        const { getByText } = await renderComponent(scenario);
        expect(getByText('None')).toBeInTheDocument();
    });

    it('opens share modal when share button is clicked', async () => {
        const scenario = {
            id: '1',
            name: 'Test Scenario',
            owner: 'test@example.com',
            retirementDate: '2025-01-01',
            permissions: { isOwner: true }
        };

        const { getByText } = await renderComponent(scenario);
        const shareButton = getByText('Share');
        expect(shareButton).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(shareButton);
        });

        expect(screen.getByText('Share Modal Content')).toBeInTheDocument();
    });
}); 