import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
    providers: [
      GoogleProvider.default({
        clientId: process.env.GOOGLE_ID,
        clientSecret: process.env.GOOGLE_SECRET,
      }), 
    ],
    secret: process.env.SECRET
}

const handler = NextAuth.default(authOptions)
export { handler as GET, handler as POST }