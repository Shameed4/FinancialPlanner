'use client';

import { motion } from 'framer-motion';

const LoadingSkeleton = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 max-w-7xl mx-auto space-y-8"
        >
            {/* Hero Section Skeleton */}
            <div className="relative h-[300px] rounded-xl overflow-hidden bg-gray-800 animate-pulse">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="h-8 w-64 bg-gray-700 rounded-lg mx-auto"></div>
                        <div className="h-10 w-32 bg-gray-700 rounded-full mx-auto"></div>
                    </div>
                </div>
            </div>

            {/* Tools Section Skeleton */}
            <div className="space-y-6">
                <div className="h-8 w-32 bg-gray-800 rounded-lg animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                            <div className="h-48 bg-gray-700"></div>
                            <div className="p-6 space-y-4">
                                <div className="h-6 w-2/3 bg-gray-700 rounded"></div>
                                <div className="h-4 w-full bg-gray-700 rounded"></div>
                                <div className="h-10 w-24 bg-gray-700 rounded-full"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default LoadingSkeleton; 