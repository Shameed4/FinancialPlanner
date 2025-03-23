'use client'

import Image from 'next/image';
import { signIn } from 'next-auth/react';
import NextAuth from 'next-auth/next'
import GoogleProvider from 'next-auth/providers/google'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const authOptions = {
    session: {
        strategy: 'jwt'
    },
    providers: [
        GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET
        })
    ],
    callbacks: {
        async signIn({ user }) {
            return true
        },
        async createUser({ user }) {
            return {
                id: user.email,
                email: user.email,
                name: user.name
            }
        },
        async session({ session, user }) {
            if (user) {
                session.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name
                }
            }
            return session
        }
    }
}

const LoginPage = () => {
    const handleGoogleLogin = async () => {
        await NextAuth(authOptions).signIn('google')
    }
    
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md backdrop-blur-lg bg-opacity-50">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to LFP</h1>
                    <p className="text-gray-600">Sign in to continue</p>
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
                        <span className="text-gray-800 font-medium">Continue with Google</span>
                    </div>
                </button>
            </div>
        </div>
    );
}

export default LoginPage