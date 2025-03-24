'use client';

import { motion } from 'framer-motion';

const PageLoadingSkeleton = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 max-w-6xl mx-auto space-y-8"
            role="main"
        >
            {/* Header Skeleton */}
            <div className="h-10 w-48 bg-gray-800 rounded-lg animate-pulse" role="heading" aria-label="header skeleton"></div>

            {/* User Info Card Skeleton */}
            <div className="bg-[#3A3A3C] rounded-xl p-6 space-y-6" role="region" aria-label="user info card skeleton">
                <div className="h-6 w-40 bg-gray-700 rounded animate-pulse"></div>
                <div className="grid grid-cols-2 gap-6" role="grid" aria-label="user info grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-2" role="listitem" aria-label="user info item">
                            <div className="h-4 w-20 bg-gray-700 rounded animate-pulse"></div>
                            <div className="h-6 w-32 bg-gray-600 rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scenarios Section Skeleton */}
            <div className="space-y-6" role="region" aria-label="scenarios section skeleton">
                <div className="h-8 w-40 bg-gray-800 rounded-lg animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" role="grid" aria-label="scenarios grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-[#1C1C1E] rounded-xl p-4 space-y-4" role="article" aria-label="scenario card">
                            <div className="h-32 bg-gray-700 rounded-lg animate-pulse"></div>
                            <div className="space-y-2">
                                <div className="h-5 w-24 bg-gray-700 rounded animate-pulse"></div>
                                <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Friends Section Skeleton */}
            <div className="space-y-6" role="region" aria-label="friends section skeleton">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-36 bg-gray-800 rounded-lg animate-pulse"></div>
                    <div className="h-8 w-32 bg-gray-800 rounded-lg animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" role="grid" aria-label="friends grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-[#1C1C1E] rounded-xl p-4 flex items-center justify-between" role="article" aria-label="friend card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse"></div>
                                <div className="h-6 w-20 bg-gray-700 rounded animate-pulse"></div>
                            </div>
                            <div className="h-6 w-6 bg-gray-700 rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default PageLoadingSkeleton; 