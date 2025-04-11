'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const ShareScenarioModal = ({ scenario, isOpen, onClose, userEmail }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [readUsers, setReadUsers] = useState([]);
    const [writeUsers, setWriteUsers] = useState([]);
    const [refreshSharing, setRefreshSharing] = useState(0);
    const { data: session } = useSession();

    // Fetch current sharing permissions when opened
    useEffect(() => {
        if (isOpen && scenario?.id) {
            fetchSharingPermissions();
        }
    }, [isOpen, scenario?.id, refreshSharing]);

    const fetchSharingPermissions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/scenarios/share?scenarioId=${scenario.id}`);
            const data = await response.json();

            if (data.status === 200) {
                setReadUsers(data.result.readonly || []);
                setWriteUsers(data.result.readwrite || []);
            } else {
                setError(data.error || 'Failed to fetch sharing permissions');
            }
        } catch (err) {
            setError('Failed to fetch sharing permissions');
            console.error('Error fetching sharing permissions:', err);
        } finally {
            setLoading(false);
        }
    };

    // Search for users as the user types
    useEffect(() => {
        if (searchQuery.length > 2) {
            searchUsers();
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const searchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/user?query=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (data.status === 200) {
                // Filter out current user and already shared users
                const filteredResults = data.result.filter(user =>
                    user.email !== userEmail &&
                    !readUsers.some(readUser => readUser.email === user.email) &&
                    !writeUsers.some(writeUser => writeUser.email === user.email)
                );
                setSearchResults(filteredResults);
            } else {
                setError(data.error || 'Failed to search users');
            }
        } catch (err) {
            setError('Failed to search users');
            console.error('Error searching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (userEmail, permission) => {
        try {
            setLoading(true);
            const response = await fetch('/api/scenarios/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scenarioId: scenario.id,
                    userEmail: userEmail,
                    permission: permission,
                    ownerEmail: session?.user?.email || "john.doe@email.com"
                }),
            });

            const data = await response.json();

            if (data.status === 200) {
                setSearchQuery('');
                setSearchResults([]);
                setRefreshSharing(prev => prev + 1);
            } else {
                setError(data.error || 'Failed to share scenario');
            }
        } catch (err) {
            setError('Failed to share scenario');
            console.error('Error sharing scenario:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (userEmail) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/scenarios/share?scenarioId=${scenario.id}&userEmail=${encodeURIComponent(userEmail)}&ownerEmail=${encodeURIComponent(session?.user?.email || "john.doe@email.com")}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.status === 200) {
                setRefreshSharing(prev => prev + 1);
            } else {
                setError(data.error || 'Failed to remove sharing');
            }
        } catch (err) {
            setError('Failed to remove sharing');
            console.error('Error removing sharing:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-black">Share "{scenario.name}"</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md mb-4">
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-2 text-sm underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search for users to share with
                    </label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {loading && <p className="text-sm text-gray-500 mt-1">Searching...</p>}

                    {searchResults.length > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                            {searchResults.map((user, index) => (
                                <div
                                    key={index}
                                    className="p-3 border-b border-gray-200 last:border-b-0 flex justify-between items-center"
                                >
                                    <span>{user.email}</span>
                                    <div>
                                        <button
                                            onClick={() => handleAddUser(user.email, 'read')}
                                            className="px-2 py-1 text-xs text-white bg-gray-500 rounded-md mr-2 hover:bg-gray-600"
                                        >
                                            Read
                                        </button>
                                        <button
                                            onClick={() => handleAddUser(user.email, 'write')}
                                            className="px-2 py-1 text-xs text-white bg-black rounded-md hover:bg-gray-800"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Shared With</h4>
                    {readUsers.length === 0 && writeUsers.length === 0 ? (
                        <p className="text-sm text-gray-500">No one has access yet</p>
                    ) : (
                        <div className="space-y-2">
                            {writeUsers.map((user, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                    <div>
                                        <p className="text-sm">{user.email}</p>
                                        <p className="text-xs text-gray-500">Can edit</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveUser(user.email)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            {readUsers.map((user, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                    <div>
                                        <p className="text-sm">{user.email}</p>
                                        <p className="text-xs text-gray-500">View only</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveUser(user.email)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareScenarioModal; 