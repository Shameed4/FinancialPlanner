import { render, screen, fireEvent, act } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { useSession, signIn, signOut } from 'next-auth/react';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

jest.mock('next/image', () => (props) => {
    // Simple mock for Next.js Image component
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || 'mocked image'} />;
});

describe('LoginPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        if (!URL.revokeObjectURL) {
            URL.revokeObjectURL = jest.fn();
        }
        // Reset fetch mock
        fetch.mockReset();
        fetch.mockImplementation(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
        }));
    });

    it('shows loading indicator when status is loading', () => {
        useSession.mockReturnValue({ status: 'loading' });
        render(<LoginPage />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows sign-in view when not authenticated', async () => {
        useSession.mockReturnValue({ status: 'unauthenticated', data: null });
        await act(async () => {
            render(<LoginPage />);
        });
        expect(screen.getByText(/welcome to LFP/i)).toBeInTheDocument();
        expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    });

    it('calls signIn when Google button is clicked', async () => {
        useSession.mockReturnValue({ status: 'unauthenticated', data: null });
        await act(async () => {
            render(<LoginPage />);
        });
        await act(async () => {
            fireEvent.click(screen.getByText(/continue with google/i));
        });
        expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/login' });
    });

    it('shows authenticated view when session exists', async () => {
        useSession.mockReturnValue({
            status: 'authenticated',
            data: { user: { name: 'Test User', email: 'test@example.com' } },
        });
        await act(async () => {
            render(<LoginPage />);
        });
        expect(screen.getByText(/welcome test user/i)).toBeInTheDocument();
        expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });

    it('calls signOut when Sign Out button is clicked', async () => {
        useSession.mockReturnValue({
            status: 'authenticated',
            data: { user: { name: 'Test User', email: 'test@example.com' } },
        });
        await act(async () => {
            render(<LoginPage />);
        });
        await act(async () => {
            fireEvent.click(screen.getByText(/sign out/i));
        });
        expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
    });

    it('handles user upsert on authenticated session', async () => {
        useSession.mockReturnValue({
            status: 'authenticated',
            data: { user: { name: 'Test User', email: 'test@example.com' } },
        });
        await act(async () => {
            render(<LoginPage />);
        });
        expect(fetch).toHaveBeenCalledWith('/api/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@example.com',
                googleId: 'test@example.com'
            })
        });
    });
}); 