'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

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

const ToolCard = ({ image, title, description, onClick }) => {
    const [imageLoading, setImageLoading] = useState(true);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-black text-white rounded-lg overflow-hidden shadow-lg"
        >
            <div className="h-48 relative">
                {imageLoading && (
                    <div className="absolute inset-0 bg-gray-800 animate-pulse" />
                )}
                <Image
                    src={image}
                    alt={title}
                    fill
                    style={{ objectFit: 'cover' }}
                    onLoadingComplete={() => setImageLoading(false)}
                />
            </div>
            <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-gray-300 mb-4">{description}</p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClick}
                    className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
                >
                    GO
                </motion.button>
            </div>
        </motion.div>
    );
};

const HomePage = () => {
    const router = useRouter();
    const [heroLoading, setHeroLoading] = useState(true);

    const navigateToSimulation = () => {
        router.push('/simulation');
    };

    const navigateToScenario = () => {
        router.push('/scenario');
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 max-w-7xl mx-auto"
        >
            <div className="relative h-[300px] mb-12 rounded-xl overflow-hidden">
                {heroLoading && (
                    <div className="absolute inset-0 z-10 bg-gray-800 animate-pulse" />
                )}
                <Image
                    src="https://picsum.photos/seed/hero/1920/1080"
                    alt="City buildings"
                    fill
                    style={{ objectFit: 'cover' }}
                    priority
                    onLoadingComplete={() => setHeroLoading(false)}
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-5xl font-bold text-white mb-6">Create a Scenario</h1>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={navigateToScenario}
                            className="bg-white text-black px-8 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
                        >
                            Start
                        </motion.button>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-black text-2xl font-semibold mb-6">Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ToolCard
                        image="https://picsum.photos/seed/simulation/800/600"
                        title="Run a Simulation"
                        description="Test your scenarios with our advanced simulation tools"
                        onClick={navigateToSimulation}
                    />
                    <ToolCard
                        image="https://picsum.photos/seed/scenarios/800/600"
                        title="View Your Scenarios"
                        description="Access and manage your saved scenarios"
                        onClick={navigateToScenario}
                    />
                    <ToolCard
                        image="https://picsum.photos/seed/yaml/800/600"
                        title="Upload YAML"
                        description="Import scenarios from YAML configuration files"
                        onClick={navigateToScenario}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default HomePage;