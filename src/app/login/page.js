'use client'

import Image from 'next/image';
import { motion } from 'framer-motion';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import pageVariants from "../components/PageAnimation";

const LoginPage = () => {
    // Retrieve session data and authentication status from next-auth
    const { data: session, status } = useSession();
    // Local state to manage loading indicator
    const [loading, setLoading] = useState(true);

    // Monitor authentication status and update loading state once determined
    useEffect(() => {
        if (status !== 'loading') {
            setLoading(false);
        }
    }, [status]);

    // Function to handle Google sign-in process
    const handleGoogleLogin = async () => {
        try {
            setLoading(true); // Set loading state while signing in
            await signIn("google", { callbackUrl: '/login' });
        } catch (error) {
            console.error("Sign-in error:", error);
            setLoading(false); // Reset loading state if an error occurs
        }
    }

    // Function to handle user logout process
    const handleLogout = async () => {
        try {
            setLoading(true); // Set loading state while signing out
            await signOut({ callbackUrl: '/login' });
        } catch (error) {
            console.error("Sign-out error:", error);
            setLoading(false); // Reset loading state if an error occurs
        }
    }

    // Render a loading indicator while authentication status is being determined
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Render authenticated view if session exists
    if (session && session.user) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md backdrop-blur-lg bg-opacity-50">
                    <div className="text-center mb-8">
                        {/* Greet the user by their email */}
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome {session.user.name}</h1>
                        <p className="text-gray-600">You are now signed in to LFP</p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="hover: cursor-pointer w-full flex items-center justify-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 mt-4"
                    >
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        );
    }

    // Render sign-in view if no active session is found
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 max-w-7xl mx-auto"
        >
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md backdrop-blur-lg bg-opacity-50">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to LFP</h1>
                        <p className="text-gray-600">Sign in with Google to continue</p>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    >
                        <div className="flex items-center gap-2">
                            <Image
                                src="/Google.png"
                                alt="Google Icon"
                                width={24}
                                height={24}
                                className="rounded-full"
                            />
                            <span className="text-gray-800 font-medium hover:cursor-pointer">Continue with Google</span>
                        </div>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default LoginPage;
