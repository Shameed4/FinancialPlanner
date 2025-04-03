'use client'

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

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
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                    {loading && <p className="text-sm text-gray-500 mt-1">Searching...</p>}

                    {searchResults.length > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                            {searchResults.map((user, index) => (
                                <div
                                    key={index}
                                    className="p-3 border-b border-gray-200 last:border-b-0 flex justify-between items-center text-gray-600"
                                >
                                    <span>{user.email}</span>
                                    <div>
                                        <button
                                            onClick={() => handleAddUser(user.email, 'read')}
                                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md mr-2 hover:cursor-pointer"
                                        >
                                            Read
                                        </button>
                                        <button
                                            onClick={() => handleAddUser(user.email, 'write')}
                                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:cursor-pointer"
                                        >
                                            Write
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">People with access</h4>

                    <div className="mb-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                            <div className="flex items-center">
                                <span className="text-gray-800">{userEmail} (You)</span>
                                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Owner</span>
                            </div>
                        </div>
                    </div>

                    {readUsers.length > 0 && (
                        <div className="mb-3">
                            <h5 className="text-sm text-gray-500 mb-1">Readers</h5>
                            {readUsers.map((user, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-800">{user.email}</span>
                                    <button
                                        onClick={() => handleRemoveUser(user.email)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {writeUsers.length > 0 && (
                        <div className="mb-3">
                            <h5 className="text-sm text-gray-500 mb-1">Editors</h5>
                            {writeUsers.map((user, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-800">{user.email}</span>
                                    <button
                                        onClick={() => handleRemoveUser(user.email)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 hover: cursor-pointer"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareScenarioModal