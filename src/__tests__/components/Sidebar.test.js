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
            'Account Settings'
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

        const accountButton = screen.getByText('Account Settings')
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

    it('handles unauthenticated state', async () => {
        jest.spyOn(require('next-auth/react'), 'useSession').mockImplementation(() => ({
            data: null,
            status: 'unauthenticated'
        }));

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        });

        expect(screen.getByText('Log In')).toBeInTheDocument();
        expect(screen.getByText('Access your account')).toBeInTheDocument();
        expect(screen.queryByText('Account Settings')).not.toBeInTheDocument();
        expect(screen.queryByText('Log Out')).not.toBeInTheDocument();
    });

    it('handles login navigation', async () => {
        jest.spyOn(require('next-auth/react'), 'useSession').mockImplementation(() => ({
            data: null,
            status: 'unauthenticated'
        }));

        const mockPush = jest.fn();
        jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
            push: mockPush,
            pathname: '/login'
        }));

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        });

        const loginButton = screen.getByText('Log In');
        await act(async () => {
            fireEvent.click(loginButton);
        });

        expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('handles active route highlighting', async () => {
        jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
            push: jest.fn(),
            pathname: '/simulation'
        }));

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        });

        const simulationButton = screen.getByText('Simulation').closest('button');
        expect(simulationButton).toHaveClass('bg-white/90');
        expect(simulationButton).toHaveClass('text-[#616161]');

        const homeButton = screen.getByText('Home').closest('button');
        expect(homeButton).not.toHaveClass('bg-white/90');
        expect(homeButton).not.toHaveClass('text-[#616161]');
    });

    it('handles parameter exploration navigation', async () => {
        const mockPush = jest.fn();
        jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
            push: mockPush,
            pathname: '/'
        }));

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        });

        const exploration1dButton = screen.getByText('1D Parameter Exploration');
        await act(async () => {
            fireEvent.click(exploration1dButton);
        });
        expect(mockPush).toHaveBeenCalledWith('/exploration-1d');

        const exploration2dButton = screen.getByText('2D Parameter Exploration');
        await act(async () => {
            fireEvent.click(exploration2dButton);
        });
        expect(mockPush).toHaveBeenCalledWith('/exploration-2d');
    });

    it('handles notice navigation', async () => {
        const mockPush = jest.fn();
        jest.spyOn(require('next/navigation'), 'useRouter').mockImplementation(() => ({
            push: mockPush,
            pathname: '/'
        }));

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        });

        const noticeButton = screen.getByText('Notice');
        await act(async () => {
            fireEvent.click(noticeButton);
        });
        expect(mockPush).toHaveBeenCalledWith('/notice');
    });

    it('handles missing user name', async () => {
        jest.spyOn(require('next-auth/react'), 'useSession').mockImplementation(() => ({
            data: {
                user: {}
            },
            status: 'authenticated'
        }));

        await act(async () => {
            render(
                <SessionProvider>
                    <Sidebar />
                </SessionProvider>
            )
        });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
}) 