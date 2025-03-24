// Used Cursor AI for help with test setup and component testing strategy
import { render, screen } from '@testing-library/react'
import PageLoadingSkeleton from '@/app/components/loading'

// Mock framer-motion to avoid animation-related issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
}))

describe('PageLoadingSkeleton Component', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders skeleton sections', () => {
        render(<PageLoadingSkeleton />)
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /header skeleton/i })).toBeInTheDocument()
        expect(screen.getByRole('region', { name: /user info card skeleton/i })).toBeInTheDocument()
        expect(screen.getByRole('region', { name: /scenarios section skeleton/i })).toBeInTheDocument()
        expect(screen.getByRole('region', { name: /friends section skeleton/i })).toBeInTheDocument()
    })

    it('has correct layout classes', () => {
        render(<PageLoadingSkeleton />)
        const mainContainer = screen.getByRole('main')
        expect(mainContainer).toHaveClass('p-8', 'max-w-6xl', 'mx-auto', 'space-y-8')
    })

    it('renders correct number of skeleton items', () => {
        render(<PageLoadingSkeleton />)
        const userInfoItems = screen.getAllByRole('listitem', { name: /user info item/i })
        expect(userInfoItems).toHaveLength(4)

        const scenarioCards = screen.getAllByRole('article', { name: /scenario card/i })
        expect(scenarioCards).toHaveLength(4)

        const friendCards = screen.getAllByRole('article', { name: /friend card/i })
        expect(friendCards).toHaveLength(4)
    })

    it('has proper structure for skeleton items', () => {
        render(<PageLoadingSkeleton />)
        const headerElement = screen.getByRole('heading', { name: /header skeleton/i })
        expect(headerElement).toHaveClass('h-10', 'w-48', 'bg-gray-800', 'rounded-lg', 'animate-pulse')
    })

    it('applies correct animation classes', () => {
        render(<PageLoadingSkeleton />)

        // Check header elements
        const headerElements = document.querySelectorAll('.bg-gray-800')
        headerElements.forEach(element => {
            expect(element).toHaveClass('animate-pulse')
            expect(element).toHaveClass('rounded-lg')
        })

        // Check user info title and labels
        const userInfoLabels = document.querySelectorAll('.h-4.bg-gray-700, .h-6.w-40.bg-gray-700')
        userInfoLabels.forEach(element => {
            expect(element).toHaveClass('animate-pulse')
            expect(element).toHaveClass('rounded')
        })

        // Check user info values
        const userInfoValues = document.querySelectorAll('.h-6.w-32.bg-gray-600')
        userInfoValues.forEach(element => {
            expect(element).toHaveClass('animate-pulse')
            expect(element).toHaveClass('rounded')
        })

        // Check scenario card containers
        const scenarioCards = screen.getAllByRole('article', { name: /scenario card/i })
        scenarioCards.forEach(card => {
            expect(card).toHaveClass('bg-[#1C1C1E]', 'rounded-xl')
        })

        // Check scenario card images
        const scenarioImages = document.querySelectorAll('.h-32.bg-gray-700')
        scenarioImages.forEach(image => {
            expect(image).toHaveClass('animate-pulse')
            expect(image).toHaveClass('rounded-lg')
        })

        // Check friend card avatars
        const friendAvatars = document.querySelectorAll('.w-10.h-10.bg-gray-700')
        friendAvatars.forEach(avatar => {
            expect(avatar).toHaveClass('animate-pulse')
            expect(avatar).toHaveClass('rounded-full')
        })
    })

    it('maintains accessibility with proper ARIA attributes', () => {
        render(<PageLoadingSkeleton />)

        // Check main container has proper role
        expect(screen.getByRole('main')).toBeInTheDocument()

        // Check all interactive elements have proper roles
        expect(screen.getByRole('grid', { name: /user info grid/i })).toBeInTheDocument()
        expect(screen.getByRole('grid', { name: /scenarios grid/i })).toBeInTheDocument()
        expect(screen.getByRole('grid', { name: /friends grid/i })).toBeInTheDocument()

        // Check all list items have proper roles
        const listItems = screen.getAllByRole('listitem')
        listItems.forEach(item => {
            expect(item).toHaveAttribute('aria-label')
        })
    })

    it('renders with responsive design classes', () => {
        render(<PageLoadingSkeleton />)

        // Check responsive grid classes
        const scenariosGrid = screen.getByRole('grid', { name: /scenarios grid/i })
        expect(scenariosGrid).toHaveClass(
            'grid-cols-1',
            'md:grid-cols-2',
            'lg:grid-cols-4'
        )

        // Check responsive spacing classes
        const mainContainer = screen.getByRole('main')
        expect(mainContainer).toHaveClass('p-8', 'max-w-6xl', 'mx-auto')
    })
}) 