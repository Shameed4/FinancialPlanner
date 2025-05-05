import { render, screen } from '@testing-library/react';
import FormSection from '@/app/scenario/components/FormSection';

// Mock framer-motion to avoid animation-related issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
}));

describe('FormSection', () => {
    const defaultProps = {
        title: 'Test Section',
        isActive: true,
        children: <div>Test Content</div>,
    };

    it('renders nothing when isActive is false', () => {
        const { container } = render(
            <FormSection {...defaultProps} isActive={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders section title and content when active', () => {
        render(<FormSection {...defaultProps} />);

        expect(screen.getByText('Test Section')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('does not show error message when no errors are provided', () => {
        render(<FormSection {...defaultProps} />);

        const errorMessage = screen.queryByText('Please fill in all required fields correctly');
        expect(errorMessage).not.toBeInTheDocument();
    });

    it('shows error message when errors object is not empty', () => {
        render(
            <FormSection
                {...defaultProps}
                errors={{ field1: 'Required', field2: 'Invalid' }}
            />
        );

        expect(screen.getByText('Please fill in all required fields correctly')).toBeInTheDocument();
    });

    it('renders with custom className from framer-motion', () => {
        const { container } = render(<FormSection {...defaultProps} />);

        const sectionDiv = container.firstChild;
        expect(sectionDiv).toHaveClass('max-w-2xl');
        expect(sectionDiv).toHaveClass('mx-auto');
    });

    it('renders multiple children correctly', () => {
        render(
            <FormSection {...defaultProps}>
                <div>Child 1</div>
                <div>Child 2</div>
                <div>Child 3</div>
            </FormSection>
        );

        expect(screen.getByText('Child 1')).toBeInTheDocument();
        expect(screen.getByText('Child 2')).toBeInTheDocument();
        expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('handles empty children gracefully', () => {
        const { container } = render(
            <FormSection title="Empty Section" isActive={true} />
        );

        expect(screen.getByText('Empty Section')).toBeInTheDocument();
        expect(container.firstChild).toBeInTheDocument();
    });
}); 