/* 
This page was originally generated using cursor, with modifications made to dynamically generate user data bassed on
who is logged in.
Cursor was initially prompted with the image of the wireframe from the design document, with the goal of designing
something similar. At the very least, we wanted to get the general structure down which we were able to do successfully.
*/

'use client';
import { useSession } from 'next-auth/react'; // Using NextAuth for session management enhances security and scalability
import { motion } from 'framer-motion'; // Framer Motion provides performant and smooth animations
import { useState } from 'react';
import Image from 'next/image'; // Next.js Image optimizes image loading and performance

const pageVariants = {
    initial: { opacity: 0, y: 20 }, // Initial state for animation: slightly offset for a smooth entrance
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: "easeOut" // Easing function for a natural deceleration
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.2,
            ease: "easeIn" // Easing function for a swift exit
        }
    }
};

const ScenarioPreview = ({ date, createdBy, imageUrl }) => (
    // The ScenarioPreview component is optimized for reusability and leverages Next.js Image for optimized media rendering
    <div className="bg-[#1C1C1E] rounded-xl p-4 text-white">
        <div className="relative h-32 w-full mb-4 rounded-lg overflow-hidden">
            <Image
                src={imageUrl}
                alt="Scenario preview"
                fill
                style={{ objectFit: 'cover' }} // Ensures images maintain aspect ratio and quality
            />
        </div>
        <div className="space-y-1">
            <p className="font-medium">{date}</p>
            <p className="text-sm text-gray-400">Created by: {createdBy}</p>
        </div>
    </div>
);

const FriendBadge = ({ name, avatar, onRemove }) => (
    // The FriendBadge component provides a compact view with a removal option, supporting efficient re-rendering
    <div className="bg-[#1C1C1E] rounded-xl p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative rounded-full overflow-hidden">
                <Image
                    src={`https://picsum.photos/seed/${name}/40/40`}
                    alt={name}
                    fill
                    style={{ objectFit: 'cover' }} // Ensures avatar images are efficiently rendered with optimal sizing
                />
            </div>
            <span className="font-medium">{name}</span>
        </div>
        <button onClick={onRemove} className="text-gray-400 hover:text-white">
            ⊗
        </button>
    </div>
);

const AccountPage = () => {
    // Session management via NextAuth enhances security by providing authenticated user context
    const { data: session } = useSession();

    // Default values provide a fallback when the user is not authenticated, improving code resilience
    const userName = session?.user?.name || "John Doe";
    const userEmail = session?.user?.email || "john.doe@email.com";

    // useState hook manages the friends list; using immutable updates (filter) ensures optimal React state management
    const [friends, setFriends] = useState([
        { name: 'JANE', avatar: null },
        { name: 'BOB', avatar: null },
        { name: 'JOE', avatar: null },
        { name: 'JACK', avatar: null }
    ]);

    // Hardcoded scenarios data simulates backend-fetched data; could be replaced with an API call for scalability
    const scenarios = [
        { date: 'February 10', createdBy: 'YOU', imageUrl: 'https://picsum.photos/seed/scenario1/400/300' },
        { date: 'February 2', createdBy: 'JANE', imageUrl: 'https://picsum.photos/seed/scenario2/400/300' },
        { date: 'January 7', createdBy: 'BOB', imageUrl: 'https://picsum.photos/seed/scenario3/400/300' },
        { date: 'January 2', createdBy: 'JOE', imageUrl: 'https://picsum.photos/seed/scenario4/400/300' }
    ];

    // Efficiently removes a friend using the filter method, ensuring immutability and optimal re-rendering
    const removeFriend = (nameToRemove) => {
        setFriends(friends.filter(friend => friend.name !== nameToRemove));
    };

    return (
        // Motion div from Framer Motion provides a declarative way to animate page transitions, reducing DOM manipulation overhead
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 max-w-6xl mx-auto" // Utility classes ensure responsive and centered layout
        >
            <h1 className="text-black text-3xl font-bold mb-8">Hello {userName}!</h1>

            {/* User Information Card */}
            <div className="bg-[#3A3A3C] rounded-xl p-6 mb-12">
                <h2 className="text-xl font-semibold mb-6 text-white">YOUR INFORMATION</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-400">Name</p>
                            <p className="text-white">{userName}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Email</p>
                            <p className="text-white">{userEmail}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-400">Location</p>
                            <p className="text-white">Stony Brook, NY</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Saved Scenarios */}
            <div className="mb-12">
                <h2 className="text-black text-2xl font-semibold mb-6">Saved Scenarios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {scenarios.map((scenario, index) => (
                        // Mapping over scenarios enables efficient rendering of each preview component
                        <ScenarioPreview
                            key={index}
                            date={scenario.date}
                            createdBy={scenario.createdBy}
                            imageUrl={scenario.imageUrl}
                        />
                    ))}
                </div>
            </div>

            {/* Friends Section */}
            <div>
                <div className="text-black flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Your Friends</h2>
                    <button className="text-2xl font-medium">Add Friend +</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {friends.map((friend, index) => (
                        // Each FriendBadge is rendered with a key for efficient reconciliation
                        <FriendBadge
                            key={index}
                            name={friend.name}
                            avatar={friend.avatar}
                            onRemove={() => removeFriend(friend.name)}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default AccountPage;
