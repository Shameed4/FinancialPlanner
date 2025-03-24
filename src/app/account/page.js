'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: "easeOut"
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.2,
            ease: "easeIn"
        }
    }
};

const ScenarioPreview = ({ date, createdBy, imageUrl }) => (
    <div className="bg-[#1C1C1E] rounded-xl p-4 text-white">
        <div className="relative h-32 w-full mb-4 rounded-lg overflow-hidden">
            <Image
                src={imageUrl}
                alt="Scenario preview"
                fill
                style={{ objectFit: 'cover' }}
            />
        </div>
        <div className="space-y-1">
            <p className="font-medium">{date}</p>
            <p className="text-sm text-gray-400">Created by: {createdBy}</p>
        </div>
    </div>
);

const FriendBadge = ({ name, avatar, onRemove }) => (
    <div className="bg-[#1C1C1E] rounded-xl p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative rounded-full overflow-hidden">
                <Image
                    src={`https://picsum.photos/seed/${name}/40/40`}
                    alt={name}
                    fill
                    style={{ objectFit: 'cover' }}
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
    const { data: session } = useSession();

    // default values if user is not logged in
    const userName = session?.user?.name || "John Doe";
    const userEmail = session?.user?.email || "john.doe@email.com";

    const [friends, setFriends] = useState([
        { name: 'JANE', avatar: null },
        { name: 'BOB', avatar: null },
        { name: 'JOE', avatar: null },
        { name: 'JACK', avatar: null }
    ]);

    const scenarios = [
        { date: 'February 10', createdBy: 'YOU', imageUrl: 'https://picsum.photos/seed/scenario1/400/300' },
        { date: 'February 2', createdBy: 'JANE', imageUrl: 'https://picsum.photos/seed/scenario2/400/300' },
        { date: 'January 7', createdBy: 'BOB', imageUrl: 'https://picsum.photos/seed/scenario3/400/300' },
        { date: 'January 2', createdBy: 'JOE', imageUrl: 'https://picsum.photos/seed/scenario4/400/300' }
    ];

    const removeFriend = (nameToRemove) => {
        setFriends(friends.filter(friend => friend.name !== nameToRemove));
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 max-w-6xl mx-auto"
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
                        <div>
                            <p className="text-gray-400">Password</p>
                            <p className="text-white">********</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Saved Scenarios */}
            <div className="mb-12">
                <h2 className="text-black text-2xl font-semibold mb-6">Saved Scenarios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {scenarios.map((scenario, index) => (
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