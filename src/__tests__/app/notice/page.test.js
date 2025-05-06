import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssumptionsPage from '../../../app/notice/page';

// Mock next/link
jest.mock('next/link', () => {
    return ({ children, href }) => {
        return <a href={href}>{children}</a>;
    };
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        main: ({ children, className }) => <main className={className}>{children}</main>,
        section: ({ children, className, onClick }) => (
            <section className={className} onClick={onClick}>
                {children}
            </section>
        ),
        div: ({ children, className }) => <div className={className}>{children}</div>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('AssumptionsPage', () => {
    it('renders the main heading', () => {
        render(<AssumptionsPage />);
        expect(screen.getByText('Project Assumptions & Constraints')).toBeInTheDocument();
    });

    it('renders all three card sections', () => {
        render(<AssumptionsPage />);
        expect(screen.getByText('Assumptions')).toBeInTheDocument();
        expect(screen.getByText('Limitations')).toBeInTheDocument();
        expect(screen.getByText('Simplifications')).toBeInTheDocument();
    });

    it('renders the back to home link', () => {
        render(<AssumptionsPage />);
        const backLink = screen.getByText('Back to Home');
        expect(backLink).toBeInTheDocument();
        expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('displays card items in a list', () => {
        render(<AssumptionsPage />);
        const assumptionsList = screen.getAllByRole('listitem');
        expect(assumptionsList.length).toBeGreaterThan(0);
    });

    it('opens popup when clicking on a card', () => {
        render(<AssumptionsPage />);
        const assumptionsCard = screen.getByText('Assumptions').closest('section');
        fireEvent.click(assumptionsCard);

        // Check if popup content is visible by looking for the popup heading
        const popupHeading = screen.getByText('Assumptions', { selector: 'h2.text-3xl' });
        expect(popupHeading).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeInTheDocument(); // Close button
    });

    it('closes popup when clicking close button', () => {
        render(<AssumptionsPage />);
        const assumptionsCard = screen.getByText('Assumptions').closest('section');
        fireEvent.click(assumptionsCard);

        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);

        // Check if popup is closed
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('applies blur effect to background when popup is open', () => {
        render(<AssumptionsPage />);
        const assumptionsCard = screen.getByText('Assumptions').closest('section');
        fireEvent.click(assumptionsCard);

        const mainContent = screen.getByText('Project Assumptions & Constraints').closest('div');
        expect(mainContent).toHaveClass('filter', 'blur-sm', 'pointer-events-none');
    });

    it('renders all items in the popup view', () => {
        render(<AssumptionsPage />);
        const assumptionsCard = screen.getByText('Assumptions').closest('section');
        fireEvent.click(assumptionsCard);

        const popupItems = screen.getAllByRole('listitem');
        expect(popupItems.length).toBeGreaterThan(0);
    });

    it('maintains card content when switching between cards', () => {
        render(<AssumptionsPage />);

        // Click on Assumptions card
        const assumptionsCard = screen.getByText('Assumptions').closest('section');
        fireEvent.click(assumptionsCard);
        const popupHeading = screen.getByText('Assumptions', { selector: 'h2.text-3xl' });
        expect(popupHeading).toBeInTheDocument();

        // Close popup
        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);

        // Click on Limitations card
        const limitationsCard = screen.getByText('Limitations').closest('section');
        fireEvent.click(limitationsCard);
        const limitationsPopupHeading = screen.getByText('Limitations', { selector: 'h2.text-3xl' });
        expect(limitationsPopupHeading).toBeInTheDocument();
    });

    it('verifies specific content in each card', () => {
        render(<AssumptionsPage />);

        // Check Assumptions content
        expect(screen.getByText(/Federal and state tax brackets and standard deductions adjust annually for inflation/)).toBeInTheDocument();

        // Check Limitations content
        expect(screen.getByText(/Ignores all taxes except federal income tax, capital gains tax, early-withdrawal tax, and state income tax/)).toBeInTheDocument();

        // Check Simplifications content
        expect(screen.getByText(/Financial goal ignores debts and real assets/)).toBeInTheDocument();
    });

    it('ensures popup content matches selected card', () => {
        render(<AssumptionsPage />);

        // Click Assumptions card and verify content
        const assumptionsCard = screen.getByText('Assumptions').closest('section');
        fireEvent.click(assumptionsCard);

        // Get the popup content specifically
        const popupContent = screen.getByText(/Federal and state tax brackets/, { selector: '.pointer-events-auto li' });
        expect(popupContent).toBeInTheDocument();

        // Close popup
        fireEvent.click(screen.getByRole('button'));

        // Click Limitations card and verify content
        const limitationsCard = screen.getByText('Limitations').closest('section');
        fireEvent.click(limitationsCard);
        const limitationsContent = screen.getByText(/Ignores all taxes/, { selector: '.pointer-events-auto li' });
        expect(limitationsContent).toBeInTheDocument();
    });

    it('checks for visual indicators on selected card', () => {
        render(<AssumptionsPage />);

        // Click Assumptions card
        const assumptionsCard = screen.getByText('Assumptions').closest('section');
        fireEvent.click(assumptionsCard);

        // Check for visual selection indicators in the background card
        const selectedCard = screen.getByText('Assumptions', { selector: 'h2.text-2xl' }).closest('section');
        expect(selectedCard).toHaveClass('w-full', 'md:w-2/3', 'cursor-pointer', 'bg-white', 'rounded-2xl', 'shadow-md', 'border-gray-800', 'border-l-4');
    });
}); 