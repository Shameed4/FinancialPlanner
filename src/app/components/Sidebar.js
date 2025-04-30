'use client';

import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { House, Infinity, SquareActivity, CircleUserRound, LogIn, LogOut, ChartArea } from "lucide-react";

// Navigation item component with animated label based on sidebar collapse state.
const NavItem = ({ icon, label, isCollapsed, onClick, isActive }) => (
    <motion.button
        initial={false}
        whileHover={!isActive ? { backgroundColor: 'rgba(255, 255, 255, 0.1)' } : {}}
        onClick={onClick}
        className={`w-full text-left px-4 py-3 flex items-center gap-3 rounded-md cursor-pointer ${isActive
            ? 'bg-white/90 text-[#616161]'
            : 'text-white'
            }`}
    >
        <span className="min-w-[24px]">
            {icon}
        </span>
        <AnimatePresence mode="wait">
            {!isCollapsed && (
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {label}
                </motion.span>
            )}
        </AnimatePresence>
    </motion.button>
);

const Sidebar = () => {
    const { data: session, status } = useSession(); // Retrieve user session
    const isAuthenticated = status === 'authenticated';

    const userName = session?.user?.name || "John Doe";
    const [isCollapsed, setIsCollapsed] = useState(false); // Manage sidebar collapse state
    const router = useRouter();

    const navigateTo = (path) => {
        router.push(path); // Navigate to the specified route
    };

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push('/');
    };

    return (
        <motion.div
            layout="position"
            className={`bg-[#24292f] text-white h-screen flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
            }}
        >
            <div className="p-4 flex items-center justify-between border-b border-gray-700">
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                        >
                            <span className="text-xl font-bold text-white">LFP</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white cursor-pointer"
                >
                    {isCollapsed ? '→' : '☰'}
                </motion.button>
            </div>

            <AnimatePresence mode="wait">
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 py-3 text-xs text-white/60"
                    >
                        NAVIGATION
                    </motion.div>
                )}
            </AnimatePresence>

            <nav className="flex-1 px-2">
                <ul className="space-y-1">
                    <li>
                        <NavItem
                            icon={<House size={20} />}
                            label="Home"
                            isCollapsed={isCollapsed}
                            onClick={() => navigateTo('/')}
                            isActive={router.pathname === '/'}
                        />
                    </li>
                    <li>
                        <NavItem
                            icon={<SquareActivity size={20} />}
                            label="Scenario"
                            isCollapsed={isCollapsed}
                            onClick={() => navigateTo('/scenario')}
                            isActive={router.pathname === '/scenario'}
                        />
                    </li>
                    <li>
                        <NavItem
                            icon={<Infinity size={20} />}
                            label="Simulation"
                            isCollapsed={isCollapsed}
                            onClick={() => navigateTo('/simulation')}
                            isActive={router.pathname === '/simulation'}
                        />
                    </li>
                    <li>
                        <NavItem
                            icon={<ChartArea size={20} />}
                            label="Charts and Results"
                            isCollapsed={isCollapsed}
                            onClick={() => navigateTo('/charts-results')}
                            isActive={router.pathname === '/charts-results'}
                        />
                    </li>
                    {/* isAuthenticated && (
                        <li>
                            <NavItem
                                icon={<CircleUserRound size={20} />}
                                label="Your Account"
                                isCollapsed={isCollapsed}
                                onClick={() => navigateTo('/account')}
                                isActive={router.pathname === '/account'}
                            />
                        </li>
                    ) */}
                </ul>
            </nav>

            <div className="border-t border-gray-700 p-4">
                {isAuthenticated ? (
                    <div className="space-y-2">
                        <motion.button
                            onClick={() => navigateTo('/account')}
                            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            className={`w-full flex items-center gap-3 p-2 rounded-md cursor-pointer ${router.pathname === '/account' ? 'bg-white/90 text-[#616161]' : 'text-white'}`}
                        >
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                👤
                            </div>
                            <AnimatePresence mode="wait">
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="font-medium text-inherit">{userName}</div>
                                        <div className="text-sm text-inherit opacity-60">Account Settings</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>

                        <motion.button
                            onClick={handleLogout}
                            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            className="w-full flex items-center gap-3 p-2 rounded-md cursor-pointer text-white"
                        >
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                <LogOut size={18} />
                            </div>
                            <AnimatePresence mode="wait">
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="font-medium">Log Out</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </div>
                ) : (
                    <motion.button
                        onClick={() => navigateTo('/login')}
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        className="w-full flex items-center gap-3 p-2 rounded-md cursor-pointer text-white"
                    >
                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                            <LogIn size={18} />
                        </div>
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="font-medium">Log In</div>
                                    <div className="text-sm opacity-60">Access your account</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};

export default Sidebar;