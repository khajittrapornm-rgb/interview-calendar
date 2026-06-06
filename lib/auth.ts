import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createServiceClient } from './supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false

      const db = createServiceClient()

      // upsert profile — role defaults to 'manager', HR ต้องเปลี่ยนใน Supabase
      const { error } = await db.from('profiles').upsert(
        {
          id: user.id ?? user.email,
          email: user.email,
          name: user.name ?? user.email,
          avatar_url: user.image,
          // ไม่ overwrite role ที่มีอยู่แล้ว
        },
        { onConflict: 'email', ignoreDuplicates: true }
      )

      if (error) console.error('upsert profile error:', error)
      return true
    },

    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      if (user?.email) {
        const db = createServiceClient()
        const { data } = await db
          .from('profiles')
          .select('id, role')
          .eq('email', user.email)
          .single()
        token.role = data?.role ?? 'manager'
        token.profileId = data?.id
      }
      return token
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.role = token.role as string
      session.user.profileId = token.profileId as string
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
