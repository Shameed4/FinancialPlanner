import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import ShareScenarioModal from '@/app/scenario/components/ShareScenarioModal';
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

// Mock fetch
global.fetch = jest.fn();

describe('ShareScenarioModal', () => {
    const mockScenario = {
        id: '1',
        name: 'Test Scenario'
    };

    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch.mockClear();

        global.fetch = jest.fn((url, options) => {
            // GET request to fetch permissions
            if (url.includes('/api/scenarios/share') && (!options || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        status: 200,
                        result: {
                            readonly: [{ email: 'read@example.com' }],
                            readwrite: []
                        }
                    })
                });
            }

            // POST request to search users
            if (url.includes('/api/user?query=')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        status: 200,
                        result: [
                            { email: 'test@example.com', name: 'Test User' }
                        ]
                    })
                });
            }

            // POST request to add a user
            if (url === '/api/scenarios/share' && options?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200 })
                });
            }

            // DELETE request to remove a user
            if (url.includes('/api/scenarios/share') && options?.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200 })
                });
            }

            // Default case - reject with network error
            return Promise.reject(new Error('Network error'));
        });
    });

    const renderComponent = async (props = {}) => {
        let result;
        await act(async () => {
            result = render(
                <ShareScenarioModal
                    scenario={mockScenario}
                    isOpen={true}
                    onClose={mockOnClose}
                    userEmail="test@example.com"
                    {...props}
                />
            );
        });
        return result;
    };

    it('renders modal when isOpen is true', async () => {
        await renderComponent();
        expect(screen.getByText('Share "Test Scenario"')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', async () => {
        await renderComponent({ isOpen: false });
        expect(screen.queryByText('Share "Test Scenario"')).not.toBeInTheDocument();
    });

    it('fetches sharing permissions when opened', async () => {
        const mockPermissions = {
            status: 200,
            result: {
                readonly: [{ email: 'read@example.com' }],
                readwrite: [{ email: 'write@example.com' }]
            }
        };

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockPermissions)
            })
        );

        await renderComponent();

        await waitFor(() => {
            expect(screen.getByText('read@example.com')).toBeInTheDocument();
            expect(screen.getByText('write@example.com')).toBeInTheDocument();
        });
    });

    it('handles non-200 status when fetching permissions', async () => {
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ status: 400, error: 'Bad request' })
            })
        );

        await renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Bad request')).toBeInTheDocument();
        });
    });

    it('handles network error when fetching permissions', async () => {
        global.fetch.mockImplementationOnce(() =>
            Promise.reject(new Error('Network error'))
        );

        await renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch sharing permissions')).toBeInTheDocument();
        });
    });

    it('searches for users when typing in search box', async () => {
        const mockSearchResults = {
            status: 200,
            result: [
                { email: 'user1@example.com' },
                { email: 'user2@example.com' }
            ]
        };

        global.fetch
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: { readonly: [], readwrite: [] } })
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockSearchResults)
                })
            );

        await renderComponent();

        const searchInput = screen.getByPlaceholderText('Enter email address');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'user' } });
        });

        await waitFor(() => {
            expect(screen.getByText('user1@example.com')).toBeInTheDocument();
            expect(screen.getByText('user2@example.com')).toBeInTheDocument();
        });
    });

    it('handles error when searching users', async () => {
        global.fetch
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: { readonly: [], readwrite: [] } })
                })
            )
            .mockImplementationOnce(() =>
                Promise.reject(new Error('Network error'))
            );

        await renderComponent();

        const searchInput = screen.getByPlaceholderText('Enter email address');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'user' } });
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to search users')).toBeInTheDocument();
        });
    });

    it('adds user with read permission', async () => {
        const mockAddResponse = { status: 200 };
        global.fetch
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: { readonly: [], readwrite: [] } })
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: [{ email: 'newuser@example.com' }] })
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockAddResponse)
                })
            );

        await renderComponent();

        const searchInput = screen.getByPlaceholderText('Enter email address');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'newuser@example.com' } });
        });

        await waitFor(() => {
            expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
        });

        const readButton = screen.getByText('Read');
        await act(async () => {
            fireEvent.click(readButton);
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/scenarios/share'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"permission":"read"')
            })
        );
    });

    it('handles error when adding user', async () => {
        global.fetch
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: { readonly: [], readwrite: [] } })
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: [{ email: 'newuser@example.com' }] })
                })
            )
            .mockImplementationOnce(() =>
                Promise.reject(new Error('Network error'))
            );

        await renderComponent();

        const searchInput = screen.getByPlaceholderText('Enter email address');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'newuser@example.com' } });
        });

        await waitFor(() => {
            expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
        });

        const readButton = screen.getByText('Read');
        await act(async () => {
            fireEvent.click(readButton);
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to share scenario')).toBeInTheDocument();
        });
    });

    it('handles error when fetching permissions with non-ok response', async () => {
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            })
        );

        await renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch sharing permissions')).toBeInTheDocument();
        });
    });

    it('handles error when fetching permissions returns invalid data', async () => {
        const scenario = { id: '123', name: 'Test Scenario' };
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(null)
        });

        render(<ShareScenarioModal isOpen={true} onClose={mockOnClose} scenarioId="123" scenario={scenario} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch sharing permissions')).toBeInTheDocument();
        });
    });

    it('handles error when sharing scenario with non-ok response', async () => {
        global.fetch
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: { readonly: [], readwrite: [] } })
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: [{ email: 'newuser@example.com' }] })
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error'
                })
            );

        await renderComponent();

        const searchInput = screen.getByPlaceholderText('Enter email address');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'newuser@example.com' } });
        });

        await waitFor(() => {
            expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
        });

        const readButton = screen.getByText('Read');
        await act(async () => {
            fireEvent.click(readButton);
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to share scenario')).toBeInTheDocument();
        });
    });

    it('handles error when searching users with non-ok response', async () => {
        global.fetch
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: { readonly: [], readwrite: [] } })
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error'
                })
            );

        await renderComponent();

        const searchInput = screen.getByPlaceholderText('Enter email address');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'user' } });
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to search users')).toBeInTheDocument();
        });
    });

    it('handles error when searching users returns invalid data', async () => {
        global.fetch
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: { readonly: [], readwrite: [] } })
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 200, result: null })
                })
            );

        await renderComponent();

        const searchInput = screen.getByPlaceholderText('Enter email address');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'user' } });
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to search users')).toBeInTheDocument();
        });
    });

    it('handles error when fetching permissions with network error', async () => {
        const scenario = { id: '123', name: 'Test Scenario' };
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        render(<ShareScenarioModal isOpen={true} onClose={mockOnClose} scenarioId="123" scenario={scenario} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch sharing permissions')).toBeInTheDocument();
        });
    });

    it('handles error when searching users returns invalid data', async () => {
        const scenario = { id: '123', name: 'Test Scenario' };
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ status: 200, result: { readonly: [], readwrite: [] } })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ status: 200, result: null })
            });

        render(<ShareScenarioModal
            isOpen={true}
            onClose={mockOnClose}
            scenario={scenario}
            userEmail="owner@example.com"
        />);

        const searchInput = screen.getByPlaceholderText(/email/i);
        fireEvent.change(searchInput, { target: { value: 'test' } });

        await waitFor(() => {
            const errorDiv = screen.getByText('Failed to search users');
            expect(errorDiv).toBeInTheDocument();
            expect(errorDiv.closest('div')).toHaveClass('bg-red-50');
        });
    });

    it('handles error when adding user with network error', async () => {
        const scenario = { id: '123', name: 'Test Scenario' };
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: [] })
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ status: 200, result: [{ id: '1', name: 'Test User', email: 'test@example.com' }] })
            })
            .mockRejectedValueOnce(new Error('Network error'));

        render(<ShareScenarioModal isOpen={true} onClose={mockOnClose} scenarioId="123" scenario={scenario} />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Enter email address');
        fireEvent.change(searchInput, { target: { value: 'test' } });

        // Wait for search results to be loaded
        await waitFor(() => {
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });

        const addButton = screen.getByText('Read');
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(screen.getByText('Failed to share scenario')).toBeInTheDocument();
        });
    });

    it('handles error when removing user with network error', async () => {
        const scenario = { id: '123', name: 'Test Scenario' };
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ status: 200, result: { readonly: [{ id: '1', name: 'Test User', email: 'test@example.com' }] } })
            })
            .mockRejectedValueOnce(new Error('Network error'));

        render(<ShareScenarioModal isOpen={true} onClose={mockOnClose} scenarioId="123" scenario={scenario} />);

        await waitFor(() => {
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });

        const removeButton = screen.getByText('Remove');
        fireEvent.click(removeButton);

        await waitFor(() => {
            expect(screen.getByText('Failed to remove sharing')).toBeInTheDocument();
        });
    });

    it('handles error when closing modal with network error', async () => {
        const scenario = { id: '123', name: 'Test Scenario' };
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ result: [] })
            })
            .mockRejectedValueOnce(new Error('Network error'));

        render(<ShareScenarioModal isOpen={true} onClose={mockOnClose} scenarioId="123" scenario={scenario} />);

        const closeButton = screen.getByRole('button', { name: '✕' });
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
}); 