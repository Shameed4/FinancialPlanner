// Used Cursor AI for help with test setup and component testing strategy
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { act } from 'react'
import Sidebar from '@/app/components/Sidebar'

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
    usePathname: () => '/dashboard',
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
    ...jest.requireActual('next-auth/react'),
    useSession: () => ({
        data: {
            user: {
                name: 'Test User',
                email: 'test@example.com',
                image: 'https://example.com/avatar.jpg'
            },
        },
        status: 'authenticated',
    }),
}))

describe('Sidebar Component', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders without crashing', async () => {
        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        })

        expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('displays user information correctly', async () => {
        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        })

        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
    })

    it('renders all navigation items', async () => {
        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        })

        const expectedItems = [
            'Home',
            'Scenario',
            'Simulation',
            'Your Account'
        ]

        expectedItems.forEach(itemText => {
            expect(screen.getByText(itemText)).toBeInTheDocument()
        })
    })

    it('handles mobile menu toggle', async () => {
        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        })

        const menuButton = screen.getByRole('button', { name: /☰/i })
        const sidebar = screen.getByRole('navigation').parentElement

        // Initially expanded
        expect(sidebar).toHaveClass('w-64')

        // Click to collapse
        await act(async () => {
            fireEvent.click(menuButton)
        })
        expect(sidebar).toHaveClass('w-20')

        // Click to expand
        await act(async () => {
            fireEvent.click(menuButton)
        })
        expect(sidebar).toHaveClass('w-64')
    })

    it('handles navigation click events', async () => {
        const mockPush = jest.fn()
        jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
            push: mockPush
        }))

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        })

        const scenarioButton = screen.getByText('Scenario')
        await act(async () => {
            fireEvent.click(scenarioButton)
        })

        expect(mockPush).toHaveBeenCalledWith('/scenario')
    })

    it('handles account navigation', async () => {
        const mockPush = jest.fn()
        jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
            push: mockPush
        }))

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        })

        const accountButton = screen.getByText('Your Account')
        await act(async () => {
            fireEvent.click(accountButton)
        })

        expect(mockPush).toHaveBeenCalledWith('/account')
    })

    it('handles sign out action', async () => {
        const mockSignOut = jest.fn()
        jest.spyOn(require('next-auth/react'), 'signOut').mockImplementation(mockSignOut)

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        })

        const signOutButton = screen.getByText('Log Out')
        await act(async () => {
            fireEvent.click(signOutButton)
        })

        expect(mockSignOut).toHaveBeenCalledWith({ redirect: false })
    })
}) 