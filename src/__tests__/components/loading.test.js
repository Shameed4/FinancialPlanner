// Used Cursor AI for help with test setup and component testing strategy
import { render, screen } from '@testing-library/react'
import PageLoadingSkeleton from '@/app/components/loading'

// Mock framer-motion to simplify testing
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>
    }
}))

describe('PageLoadingSkeleton Component', () => {
    it('renders all skeleton sections', () => {
        render(<PageLoadingSkeleton />)

        // Check for header skeleton
        const header = screen.getByRole('heading', { name: /header skeleton/i })
        expect(header).toBeInTheDocument()
        expect(header).toHaveClass('animate-pulse')

        // Check for user info card skeleton
        const userInfoCard = screen.getByRole('region', { name: /user info card skeleton/i })
        expect(userInfoCard).toBeInTheDocument()
        expect(userInfoCard.querySelectorAll('.animate-pulse')).toHaveLength(9) // 1 title + (4 info items × 2 elements each)

        // Check for scenarios section skeleton
        const scenariosSection = screen.getByRole('region', { name: /scenarios section skeleton/i })
        expect(scenariosSection).toBeInTheDocument()
        expect(scenariosSection.querySelectorAll('.animate-pulse')).toHaveLength(13) // 1 title + (4 cards × 3 elements each)

        // Check for friends section skeleton
        const friendsSection = screen.getByRole('region', { name: /friends section skeleton/i })
        expect(friendsSection).toBeInTheDocument()
        expect(friendsSection.querySelectorAll('.animate-pulse')).toHaveLength(14) // 2 titles + (4 cards × 3 elements each)
    })

    it('renders with correct layout classes', () => {
        render(<PageLoadingSkeleton />)

        // Check main container
        const mainContainer = screen.getByRole('main')
        expect(mainContainer).toHaveClass('p-8', 'max-w-6xl', 'mx-auto', 'space-y-8')

        // Check grid layouts
        const userInfoGrid = screen.getByRole('grid', { name: /user info grid/i })
        expect(userInfoGrid).toHaveClass('grid', 'grid-cols-2', 'gap-6')

        const scenariosGrid = screen.getByRole('grid', { name: /scenarios grid/i })
        expect(scenariosGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-6')

        const friendsGrid = screen.getByRole('grid', { name: /friends grid/i })
        expect(friendsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-6')
    })

    it('renders correct number of skeleton items', () => {
        render(<PageLoadingSkeleton />)

        // Check user info items
        const userInfoItems = screen.getAllByRole('listitem', { name: /user info item/i })
        expect(userInfoItems).toHaveLength(4)

        // Check scenario cards
        const scenarioCards = screen.getAllByRole('article', { name: /scenario card/i })
        expect(scenarioCards).toHaveLength(4)

        // Check friend cards
        const friendCards = screen.getAllByRole('article', { name: /friend card/i })
        expect(friendCards).toHaveLength(4)
    })
}) 