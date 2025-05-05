import { render, screen, fireEvent } from '@testing-library/react';
import ScenarioCard from '@/app/scenario/components/ScenarioCard';

// Mock URL object
global.URL = {
    createObjectURL: jest.fn(),
    revokeObjectURL: jest.fn()
};

jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { email: 'test@email.com' } } }),
}));
jest.mock('@/utils/scenarioConverter', () => ({
    jsonToYaml: jest.fn(async () => 'yaml-content'),
}));
jest.mock('@/app/scenario/components/ShareScenarioModal', () => (props) => (
    props.isOpen ? <div data-testid="share-modal">Share Modal Open</div> : null
));

const baseScenario = {
    name: 'Retirement Plan',
    forIndividual: true,
    residenceState: 'CA',
    userBirthYear: 1980,
    financialGoal: 1000000,
    assetTypes: ['Stocks', 'Bonds'],
    permissions: { isOwner: true, canWrite: true },
    investmentScenario: [{ investment: { assetType: 'Stocks' } }],
};

describe('ScenarioCard', () => {
    it('renders scenario name, details, and permission badge', () => {
        render(<ScenarioCard scenario={baseScenario} onEdit={jest.fn()} />);
        expect(screen.getByText(/Retirement Plan/)).toBeInTheDocument();
        expect(screen.getByText(/Owner/)).toBeInTheDocument();
        expect(screen.getByText(/Individual/)).toBeInTheDocument();
        expect(screen.getByText(/CA/)).toBeInTheDocument();
        expect(screen.getByText(/1980/)).toBeInTheDocument();
        expect(screen.getByText(/\$1,000,000/)).toBeInTheDocument();
    });

    it('shows Edit button for owner/editor and calls onEdit when clicked', () => {
        const onEdit = jest.fn();
        render(<ScenarioCard scenario={baseScenario} onEdit={onEdit} />);
        const editBtn = screen.getByText(/edit/i);
        fireEvent.click(editBtn);
        expect(onEdit).toHaveBeenCalledWith(baseScenario);
    });

    it('shows Download YAML button and triggers download logic', async () => {
        render(<ScenarioCard scenario={baseScenario} onEdit={jest.fn()} />);
        const createElementSpy = jest.spyOn(document, 'createElement');
        const appendChildSpy = jest.spyOn(document.body, 'appendChild');
        const removeChildSpy = jest.spyOn(document.body, 'removeChild');
        const revokeSpy = jest.spyOn(URL, 'revokeObjectURL');

        await fireEvent.click(screen.getByText(/download yaml/i));

        // Wait for the next tick to allow async operations to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        // The download logic should create an anchor element
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(revokeSpy).toHaveBeenCalled();

        // Clean up spies
        createElementSpy.mockRestore();
        appendChildSpy.mockRestore();
        removeChildSpy.mockRestore();
        revokeSpy.mockRestore();
    });

    it('shows Share button for owner and opens modal on click', () => {
        render(<ScenarioCard scenario={baseScenario} onEdit={jest.fn()} />);
        const shareBtn = screen.getByText(/share/i);
        fireEvent.click(shareBtn);
        expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });

    it('renders correct asset types and handles None gracefully', () => {
        const scenario = { ...baseScenario, assetTypes: [], investmentScenario: [] };
        render(<ScenarioCard scenario={scenario} onEdit={jest.fn()} />);
        expect(screen.getByText(/None/)).toBeInTheDocument();
    });
}); 