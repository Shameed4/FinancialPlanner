import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreateScenarioForm } from '../../app/scenario/CreateScenarioForm';
import { US_STATES } from '../../utils/constants';
import { motion } from 'framer-motion';

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
}));

describe('CreateScenarioForm', () => {
    const mockOnScenarioCreate = jest.fn();
    const defaultProps = {
        onScenarioCreate: mockOnScenarioCreate,
    };

    const fillRequiredFields = () => {
        fireEvent.change(screen.getByLabelText(/Scenario Name/i), { target: { value: 'Test Scenario' } });
        fireEvent.change(screen.getByLabelText(/Birth Year/i), { target: { value: '1990' } });
        fireEvent.change(screen.getByLabelText(/Life Expectancy \(years\)/i), { target: { value: '90' } });
        fireEvent.change(screen.getByLabelText(/Residence State/i), { target: { value: 'California' } });
        fireEvent.change(screen.getByLabelText(/Financial Goal/i), { target: { value: '1000000' } });
    };

    beforeEach(() => {
        render(<CreateScenarioForm {...defaultProps} />);
    });

    it('renders initial fields', () => {
        expect(screen.getByLabelText(/Scenario Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Birth Year/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Life Expectancy \(years\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Life Expectancy Standard Deviation/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Financial Goal/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Inflation Assumption/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Married Couple \(check if married\)/i)).toBeInTheDocument();
    });

    it('validates required fields in step 1', async () => {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);

        // Check for validation messages
        expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
        expect(await screen.findByText(/Birth year is required/i)).toBeInTheDocument();
        expect(await screen.findByText(/Life expectancy is required/i)).toBeInTheDocument();
        expect(await screen.findByText(/Residence state is required/i)).toBeInTheDocument();
        expect(await screen.findByText(/Financial goal is required/i)).toBeInTheDocument();
    });

    it('allows navigation between steps when required fields are filled', async () => {
        fillRequiredFields();

        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);

        // Should proceed to step 2 and show the next section
        await waitFor(() => {
            expect(screen.queryByText('General Information')).not.toBeInTheDocument();
        }, { timeout: 2000 });
    });

    it('handles inflation type changes correctly', () => {
        const inflationSelect = screen.getByLabelText(/Inflation Assumption/i);

        // Test normal distribution
        fireEvent.change(inflationSelect, { target: { value: 'normal' } });
        expect(screen.getByLabelText(/Mean Rate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Standard Deviation \(%\)/i)).toBeInTheDocument();

        // Test fixed rate
        fireEvent.change(inflationSelect, { target: { value: 'fixed' } });
        expect(screen.getByLabelText(/Fixed Rate/i)).toBeInTheDocument();

        // Test uniform distribution
        fireEvent.change(inflationSelect, { target: { value: 'uniform' } });
        expect(screen.getByLabelText(/Minimum Rate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Maximum Rate/i)).toBeInTheDocument();
    });

    it('handles spouse fields when married option is selected', () => {
        const marriedCheckbox = screen.getByLabelText(/Married Couple \(check if married\)/i);

        // Check the married checkbox
        fireEvent.click(marriedCheckbox);

        // Verify spouse fields appear
        expect(screen.getByLabelText(/Spouse Birth Year/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Spouse Life Expectancy/i)).toBeInTheDocument();
    });

    it('handles event series addition and validation', async () => {
        // Fill required fields and navigate to events section
        fillRequiredFields();

        // Navigate to step 4
        for (let i = 0; i < 3; i++) {
            fireEvent.click(screen.getByText('Next'));
            await waitFor(() => { });
        }

        // Add new event
        fireEvent.click(screen.getByText('Add Event'));

        // Should show event type selector
        expect(screen.getByLabelText(/Event Type/i)).toBeInTheDocument();

        // Select income event type
        fireEvent.change(screen.getByLabelText(/Event Type/i), {
            target: { value: 'income' },
        });

        // Should show income-specific fields
        expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Annual Change Type/i)).toBeInTheDocument();

        // Test removing the event
        fireEvent.click(screen.getByText('Remove'));
        expect(screen.queryByLabelText(/Event Type/i)).not.toBeInTheDocument();
    });

    it('submits form with correct data', async () => {
        fillRequiredFields();

        // Navigate through all steps
        for (let i = 0; i < 4; i++) {
            const nextButton = screen.getByText('Next');
            fireEvent.click(nextButton);
            await waitFor(() => { }, { timeout: 2000 });
        }

        // Click Create Scenario on the final step
        const createButton = screen.getByText('Create Scenario');
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockOnScenarioCreate).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Scenario',
                userBirthYear: '1990',
                userLifeExpectancyMean: '90',
                residenceState: 'California',
                financialGoal: '1000000'
            }));
        });
    });
}); 