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
        <>
            <button
                onClick={handleGoogleLogin}
                className="mt-4 flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer"
            >
                <Image
                    src="/Google.png"
                    alt="Google Icon"
                    width={20}
                    height={20}
                    className="mr-2"
                />
                Login with Google
            </button>
        </>
    );
}

export default LoginPage